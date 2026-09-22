import { Router } from 'express';
import { getDb } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from '../lib/id.js';

const r = Router();
const TIER = { silver: 19.9, gold: 39.9 };

// 旧版 410 → 新版打通自助购买
 r.post('/subscribe', auth, (req, res) => {
  const tier = req.body.tier;
  if (!TIER[tier]) return res.status(400).json({ error: 'bad tier' });
  const id = nanoid();
  getDb().prepare('INSERT INTO orders (id,user_id,type,amount_cny,status,created_at) VALUES (?,?,\'membership\',?,\'pending\',?)')
    .run(id, req.user.id, TIER[tier], Date.now());
  // 复用 /api/pay/alipay/create 或 /paypal/create，支付成功 notify → UPDATE users SET tier, tier_expires_at=now+30d
  res.json({ orderId: id, amount: TIER[tier], tier });
});

export default r;