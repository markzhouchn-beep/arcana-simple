-- ARCANA Simple schema
-- 订单状态机：pending → paying → paid → interpreting → done
--            ↘ failed（可重试）  ↘ interpret_failed（可重试 AI）
--            cancelled / refunded / expired

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  tier_expires_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_cn TEXT, name_en TEXT,
  arcana TEXT,
  suit TEXT, number INTEGER,
  upright TEXT, reversed TEXT,
  love TEXT, career TEXT, wealth TEXT,
  keywords TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,                          -- draw | membership
  card_count INTEGER,
  amount_cny REAL,
  currency TEXT DEFAULT 'CNY',
  -- 状态机：pending | paying | paid | interpreting | done | failed | interpret_failed | cancelled | refunded | expired
  status TEXT DEFAULT 'pending',
  payment_method TEXT,                -- alipay | paypal
  out_trade_no TEXT,
  alipay_trade_no TEXT,
  paypal_order_id TEXT,
  paid_amount REAL,
  paid_at INTEGER,
  fail_reason TEXT,                   -- 支付失败原因
  retry_count INTEGER DEFAULT 0,      -- 支付重试次数
  question TEXT,                      -- 用户问题（抽牌用）
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS draws (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  user_id TEXT,
  card_ids TEXT,                      -- JSON 数组
  orientation TEXT,                   -- JSON 正逆位
  card_count INTEGER DEFAULT 1,
  -- 解读状态：queued | generating | ready | failed
  status TEXT DEFAULT 'queued',
  interpretation TEXT,
  error_message TEXT,                 -- AI 失败原因
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_draws_order ON draws(order_id);
CREATE INDEX IF NOT EXISTS idx_draws_status ON draws(status);
