import jwt from 'jsonwebtoken';
export function auth(req, res, next) {
  const t = (req.headers.authorization || '').slice(7);
  try { req.user = jwt.verify(t, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'no auth' }); }
}