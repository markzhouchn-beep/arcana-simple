import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const r = Router();
const sign = (a) => jwt.sign({ admin: true, id: a.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

r.post('/login', (req, res) => {
  const a = getDb().prepare('SELECT * FROM admins WHERE username=?').get(req.body.username);
  if (!a || !bcrypt.compareSync(req.body.password, a.password_hash)) return res.status(401).json({ error: 'bad' });
  res.json({ token: sign(a) });
});

function adminAuth(req, res, next) {
  const t = (req.headers.authorization || '').slice(7);
  try { const p = jwt.verify(t, process.env.JWT_SECRET); if (!p.admin) throw 0; req.admin = p; next(); }
  catch { res.status(401).json({ error: 'nope' }); }
}

r.get('/orders', adminAuth, (req, res) => {
  res.json(getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all());
});

r.post('/grant', adminAuth, (req, res) => {
  const days = req.body.days || 30;
  getDb().prepare('UPDATE users SET tier=?, tier_expires_at=? WHERE id=?')
    .run(req.body.tier, Date.now() + days * 86400000, req.body.userId);
  res.json({ ok: true });
});

export default r;