import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from '../lib/id.js';
import { enqueueInterpretation, processDraw } from '../lib/ai.js';

const r = Router();

/**
 * 订单状态机（支付侧）
 * pending → paying → paid → interpreting → done
 *         ↘ failed（可重试：回到 pending 并 +retry_count）
 * paid 之后解读失败 → interpret_failed（可重试 AI）
 * cancelled / refunded / expired
 */
const CAN_RETRY_PAY = new Set(['pending', 'failed']);
const CAN_RETRY_AI = new Set(['interpret_failed']);

// 查询订单（含 draw 状态，前端轮询用）
r.get('/:id', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  const draw = db.prepare('SELECT id,status,interpretation,error_message,retry_count,card_ids,orientation,created_at,updated_at FROM draws WHERE order_id=?').get(order.id);
  res.json({
    order: {
      id: order.id,
      type: order.type,
      status: order.status,
      amount_cny: order.amount_cny,
      card_count: order.card_count,
      payment_method: order.payment_method,
      fail_reason: order.fail_reason,
      retry_count: order.retry_count,
      paid_at: order.paid_at,
      created_at: order.created_at,
    },
    draw: draw || null,
    // 前端轮询提示
    poll: draw && ['queued', 'generating'].includes(draw.status),
  });
});

// 支付失败后重试：仅 failed / pending 可重开
r.post('/:id/retry-pay', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  if (!CAN_RETRY_PAY.has(order.status)) {
    return res.status(400).json({ error: 'CANNOT_RETRY', status: order.status, message: '当前状态不可重试支付' });
  }
  if ((order.retry_count || 0) >= 5) {
    return res.status(400).json({ error: 'RETRY_LIMIT', message: '重试次数过多，请联系客服' });
  }
  // 清掉旧支付凭证，回到 pending，允许重新拉起支付宝/PayPal
  db.prepare(`UPDATE orders SET
    status='pending',
    out_trade_no=NULL,
    paypal_order_id=NULL,
    alipay_trade_no=NULL,
    fail_reason=NULL,
    retry_count=retry_count+1,
    updated_at=?
    WHERE id=?`).run(Date.now(), order.id);
  res.json({ ok: true, orderId: order.id, retry_count: (order.retry_count || 0) + 1 });
});

// AI 解读失败后重试
r.post('/:id/retry-ai', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  if (!CAN_RETRY_AI.has(order.status) && order.status !== 'paid') {
    return res.status(400).json({ error: 'CANNOT_RETRY_AI', status: order.status });
  }
  const draw = db.prepare('SELECT * FROM draws WHERE order_id=?').get(order.id);
  if (!draw) {
    const d = enqueueInterpretation(order.id);
    return res.json({ ok: true, drawId: d?.id, status: 'queued' });
  }
  if ((draw.retry_count || 0) >= 3) {
    return res.status(400).json({ error: 'AI_RETRY_LIMIT', message: '解读重试次数过多，请稍后再试或联系客服' });
  }
  db.prepare(`UPDATE draws SET status='queued', error_message=NULL, updated_at=? WHERE id=?`).run(Date.now(), draw.id);
  db.prepare(`UPDATE orders SET status='interpreting', updated_at=? WHERE id=?`).run(Date.now(), order.id);
  setImmediate(() => processDraw(draw.id).catch(console.error));
  res.json({ ok: true, drawId: draw.id, status: 'queued' });
});

// 取消未支付订单
r.post('/:id/cancel', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  if (!['pending', 'failed', 'paying'].includes(order.status)) {
    return res.status(400).json({ error: 'CANNOT_CANCEL', status: order.status });
  }
  db.prepare(`UPDATE orders SET status='cancelled', updated_at=? WHERE id=?`).run(Date.now(), order.id);
  res.json({ ok: true });
});

export default r;
