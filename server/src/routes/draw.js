import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from '../lib/id.js';

const r = Router();
const DECK = Array.from({ length: 78 }, (_, i) => i + 1);

function pick(n) { return [...DECK].sort(() => Math.random() - 0.5).slice(0, n); }

// 免费 Yes/No
r.get('/free', auth, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const used = db.prepare('SELECT 1 FROM draws WHERE user_id=? AND date(created_at/1000,\'unixepoch\')=? AND card_count=1').get(req.user.id, today);
  if (used) return res.status(429).json({ error: 'daily free used' });
  const cardId = pick(1)[0];
  const card = db.prepare('SELECT * FROM cards WHERE id=?').get(cardId);
  const up = Math.random() > 0.5;
  res.json({ card, orientation: up ? 'upright' : 'reversed', text: up ? card.upright : card.reversed });
});

// 付费解读：先创建订单，支付成功后触发
const PRICE = { 1: 1.9, 3: 3.9, 10: 9.9 };
r.post('/paid', auth, (req, res) => {
  const n = [1, 3, 10].includes(req.body.count) ? req.body.count : 1;
  const id = nanoid();
  getDb().prepare('INSERT INTO orders (id,user_id,type,card_count,amount_cny,status,created_at) VALUES (?,?,?,?,?,\'pending\',?)')
    .run(id, req.user.id, 'draw', n, PRICE[n], Date.now());
  res.json({ orderId: id, amount: PRICE[n] });
});

export default r;