import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import drawRoutes from './routes/draw.js';
import payRoutes from './routes/pay.js';
import memberRoutes from './routes/membership.js';
import adminRoutes from './routes/admin.js';
import cardRoutes from './routes/cards.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

initDb();

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/draw', drawRoutes);
app.use('/api/pay', payRoutes);
app.use('/api/membership', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cards', cardRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('arcana-simple server :' + PORT));