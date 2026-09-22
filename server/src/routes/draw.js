import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from '../lib/id.js';

const r = Router();
const DECK = Array.from({ length: 78 }, (_, i) => i + 1);
function pick(n) {
  const s = [...DECK];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s.slice(0, n);
}

// 免费 Yes/No（不调 AI）
r.get('/free', auth, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const used = db.prepare(
    `SELECT 1 FROM draws WHERE user_id=? AND date(created_at/1000,'unixepoch')=? AND card_count=1 AND order_id IS NULL`
  ).get(req.user.id, today);
  if (used) return res.status(429).json({ error: 'daily free used' });

  const cardId = pick(1)[0];
  const card = db.prepare('SELECT * FROM cards WHERE id=?').get(cardId) || { name_cn: '愚者', upright: '新的开始', reversed: '鲁莽' };
  const up = Math.random() > 0.5;
  const id = nanoid();
  db.prepare(`INSERT INTO draws (id,user_id,card_ids,orientation,card_count,status,interpretation,created_at,updated_at)
    VALUES (?,?,?,?,1,'ready',?,?,?)`)
    .run(id, req.user.id, JSON.stringify([cardId]), JSON.stringify([up ? 'upright' : 'reversed']),
      up ? (card.upright || '') : (card.reversed || ''), Date.now(), Date.now());
  res.json({ card, orientation: up ? 'upright' : 'reversed', text: up ? card.upright : card.reversed });
});

// 创建付费订单（pending，等支付）
const PRICE = { 1: 1.9, 3: 3.9, 10: 9.9 };
r.post('/paid', auth, (req, res) => {
  const n = [1, 3, 10].includes(req.body.count) ? req.body.count : 1;
  const question = (req.body.question || '').slice(0, 500);
  const id = nanoid();
  const now = Date.now();
  getDb().prepare(`INSERT INTO orders (id,user_id,type,card_count,amount_cny,status,question,retry_count,created_at,updated_at)
    VALUES (?,?, 'draw', ?, ?, 'pending', ?, 0, ?, ?)`)
    .run(id, req.user.id, n, PRICE[n], question, now, now);
  res.json({ orderId: id, amount: PRICE[n], status: 'pending' });
});

// 轮询解读结果（前端支付成功后用）
r.get('/result/:orderId', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.orderId, req.user.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  const draw = db.prepare('SELECT * FROM draws WHERE order_id=?').get(order.id);

  res.json({
    orderStatus: order.status,
    drawStatus: draw?.status || null,
    interpretation: draw?.status === 'ready' ? draw.interpretation : null,
    error: draw?.error_message || order.fail_reason || null,
    // 前端根据 poll=true 继续轮询（2s 一次，最多 60 次）
    poll: ['paying', 'paid', 'interpreting'].includes(order.status)
      || (draw && ['queued', 'generating'].includes(draw.status)),
    canRetryPay: ['pending', 'failed'].includes(order.status),
    canRetryAi: order.status === 'interpret_failed' || draw?.status === 'failed',
  });
});

export default r;
