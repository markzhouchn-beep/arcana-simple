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
  type TEXT,
  card_count INTEGER,
  amount_cny REAL,
  currency TEXT DEFAULT 'CNY',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  out_trade_no TEXT,
  alipay_trade_no TEXT,
  paypal_order_id TEXT,
  paid_amount REAL,
  paid_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS draws (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  user_id TEXT,
  card_ids TEXT,
  orientation TEXT,
  interpretation TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT
);