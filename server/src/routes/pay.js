import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import * as alipay from '../lib/alipay.js';
import * as paypal from '../lib/paypal.js';
import { toCNY } from '../lib/geo.js';
import { nanoid } from '../lib/id.js';
import { enqueueInterpretation } from '../lib/ai.js';

const r = Router();

// 仅 pending / failed 可发起支付
function assertPayable(order) {
  if (!order) return { ok: false, code: 404, error: 'ORDER_NOT_FOUND' };
  if (!['pending', 'failed'].includes(order.status)) {
    return { ok: false, code: 400, error: 'NOT_PAYABLE', status: order.status };
  }
  return { ok: true };
}

r.post('/alipay/create', auth, (req, res) => {
  const order = getDb().prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.body.orderId, req.user.id);
  const check = assertPayable(order);
  if (!check.ok) return res.status(check.code).json(check);

  const out = 'A' + nanoid(10);
  getDb().prepare(`UPDATE orders SET out_trade_no=?, payment_method='alipay', status='paying', updated_at=? WHERE id=?`)
    .run(out, Date.now(), order.id);

  const html = alipay.createWapPayForm({
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL,
    returnUrl: process.env.ALIPAY_RETURN_URL,
    outTradeNo: out,
    totalAmount: order.amount_cny,
    subject: `星语塔罗 ${order.card_count || ''}张`,
  });
  res.type('html').send(html);
});

r.post('/alipay/notify', expressRaw, (req, res) => {
  const params = Object.fromEntries(new URLSearchParams(req.body.toString()));
  if (!alipay.verifyNotify(params, process.env.ALIPAY_PUBLIC_KEY)) return res.send('fail');

  const order = getDb().prepare('SELECT * FROM orders WHERE out_trade_no=?').get(params.out_trade_no);
  if (!order) return res.send('fail');
  // 幂等：已 paid/done/interpreting 直接 success
  if (['paid', 'interpreting', 'done', 'interpret_failed'].includes(order.status)) return res.send('success');

  if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
    if (Math.abs(Number(params.total_amount) - order.amount_cny) > 0.01) return res.send('fail');
    getDb().prepare(`UPDATE orders SET status='paid', alipay_trade_no=?, paid_amount=?, paid_at=?, fail_reason=NULL, updated_at=? WHERE id=?`)
      .run(params.trade_no, Number(params.total_amount), Date.now(), Date.now(), order.id);
    // 异步生成解读，不阻塞 notify
    enqueueInterpretation(order.id);
    return res.send('success');
  }

  if (params.trade_status === 'TRADE_CLOSED') {
    getDb().prepare(`UPDATE orders SET status='failed', fail_reason='TRADE_CLOSED', updated_at=? WHERE id=?`)
      .run(Date.now(), order.id);
    return res.send('success');
  }

  return res.send('success');
});

r.post('/paypal/create', auth, async (req, res) => {
  try {
    const order = getDb().prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.body.orderId, req.user.id);
    const check = assertPayable(order);
    if (!check.ok) return res.status(check.code).json(check);

    const pp = await paypal.createOrder({ amount: order.amount_cny, currency: 'CNY' });
    // 关键：重开时同步写回 paypal_order_id
    getDb().prepare(`UPDATE orders SET paypal_order_id=?, payment_method='paypal', status='paying', updated_at=? WHERE id=?`)
      .run(pp.id, Date.now(), order.id);
    res.json({ approveUrl: pp.links.find(l => l.rel === 'approve').href });
  } catch (err) {
    console.error('[paypal create]', err.message);
    res.status(500).json({ error: 'PAYPAL_CREATE_FAILED', message: err.message });
  }
});

r.get('/paypal/return', async (req, res) => {
  try {
    const token = req.query.token;
    const order = getDb().prepare('SELECT * FROM orders WHERE paypal_order_id=?').get(token);
    if (!order) return res.redirect('/pay/return?error=order_not_found');

    if (['paid', 'interpreting', 'done'].includes(order.status)) {
      return res.redirect('/pay/return?orderId=' + order.id);
    }

    const cap = await paypal.captureOrder(token);
    if (cap.status !== 'COMPLETED') {
      getDb().prepare(`UPDATE orders SET status='failed', fail_reason=?, updated_at=? WHERE id=?`)
        .run(cap.status || 'CAPTURE_FAILED', Date.now(), order.id);
      return res.redirect('/pay/return?orderId=' + order.id + '&status=failed');
    }

    const amount = Number(cap.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || order.amount_cny);
    const currency = cap.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'CNY';
    getDb().prepare(`UPDATE orders SET status='paid', paid_amount=?, paid_at=?, fail_reason=NULL, updated_at=? WHERE id=?`)
      .run(toCNY(amount, currency), Date.now(), Date.now(), order.id);
    enqueueInterpretation(order.id);
    res.redirect('/pay/return?orderId=' + order.id);
  } catch (err) {
    console.error('[paypal return]', err.message);
    res.redirect('/pay/return?error=' + encodeURIComponent(err.message));
  }
});

function expressRaw(req, res, next) {
  let d = '';
  req.on('data', c => (d += c));
  req.on('end', () => { req.body = d; next(); });
}

export default r;
