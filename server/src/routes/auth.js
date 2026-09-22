import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { nanoid } from '../lib/id.js';

const r = Router();
const sign = (u) => jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

r.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  const db = getDb();
  try {
    const id = nanoid();
    db.prepare('INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)')
      .run(id, email, bcrypt.hashSync(password, 10), Date.now());
    res.json({ token: sign({ id, email }) });
  } catch { res.status(409).json({ error: 'email exists' }); }
});

r.post('/login', (req, res) => {
  const u = getDb().prepare('SELECT * FROM users WHERE email=?').get(req.body.email);
  if (!u || !bcrypt.compareSync(req.body.password, u.password_hash)) return res.status(401).json({ error: 'bad creds' });
  res.json({ token: sign(u) });
});

export default r;