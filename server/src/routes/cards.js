import { Router } from 'express';
import { getDb } from '../db.js';
const r = Router();
r.get('/', (_, res) => res.json(getDb().prepare('SELECT id,slug,name_cn,name_en,arcana FROM cards').all()));
r.get('/:slug', (req, res) => {
  const c = getDb().prepare('SELECT * FROM cards WHERE slug=?').get(req.params.slug);
  if (!c) return res.status(404).json({ error: 'nope' });
  res.json(c);
});
export default r;