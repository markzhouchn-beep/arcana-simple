import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import * as alipay from '../lib/alipay.js';
import * as paypal from '../lib/paypal.js';
import { toCNY } from '../lib/geo.js';
import { nanoid } from '../lib/id.js';

const r = Router();

r.post('/alipay/create', auth, (req, res) => {
  const order = getDb().prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.body.orderId, req.user.id);
  if (!order) return res.status(404).json({ error: 'no order' });
  const out = 'A' + nanoid(10);
  getDb().prepare('UPDATE orders SET out_trade_no=?,payment_method=\'alipay\' WHERE id=?').run(out, order.id);
  const html = alipay.createWapPayForm({
    appId: process.env.ALIPAY_APP_ID, privateKey: process.env.ALIPAY_PRIVATE_KEY,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL, returnUrl: process.env.ALIPAY_RETURN_URL,
    outTradeNo: out, totalAmount: order.amount_cny, subject: `星语塔罗 ${order.card_count}张` });
  res.type('html').send(html);
});

r.post('/alipay/notify', expressRaw, (req, res) => {
  const params = Object.fromEntries(new URLSearchParams(req.body.toString()));
  if (!alipay.verifyNotify(params, process.env.ALIPAY_PUBLIC_KEY)) return res.send('fail');
  const order = getDb().prepare('SELECT * FROM orders WHERE out_trade_no=?').get(params.out_trade_no);
  if (!order || order.status === 'paid') return res.send('success');
  if (Math.abs(Number(params.total_amount) - order.amount_cny) > 0.01) return res.send('fail');
  getDb().prepare('UPDATE orders SET status=\'paid\',alipay_trade_no=?,paid_amount=?,paid_at=? WHERE id=?')
    .run(params.trade_no, Number(params.total_amount), Date.now(), order.id);
  res.send('success');
});

r.post('/paypal/create', auth, async (req, res) => {
  const order = getDb().prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.body.orderId, req.user.id);
  if (!order) return res.status(404).json({ error: 'no order' });
  const pp = await paypal.createOrder({ amount: order.amount_cny, currency: 'CNY' });
  // 关键：重开时同步写回 paypal_order_id
  getDb().prepare('UPDATE orders SET paypal_order_id=?,payment_method=\'paypal\' WHERE id=?').run(pp.id, order.id);
  res.json({ approveUrl: pp.links.find(l => l.rel === 'approve').href });
});

r.get('/paypal/return', async (req, res) => {
  const cap = await paypal.captureOrder(req.query.token);
  const order = getDb().prepare('SELECT * FROM orders WHERE paypal_order_id=?').get(req.query.token);
  if (order && order.status !== 'paid') {
    getDb().prepare('UPDATE orders SET status=\'paid\',paid_amount=?,paid_at=? WHERE id=?')
      .run(toCNY(Number(cap.purchase_units[0].payments.captures[0].amount.value), cap.purchase_units[0].payments.captures[0].amount.currency_code), Date.now(), order.id);
  }
  res.redirect('/pay/return?orderId=' + (order?.id || ''));
});

function expressRaw(req, res, next) { let d = ''; req.on('data', c => d += c); req.on('end', () => { req.body = d; next(); }); }

export default r;