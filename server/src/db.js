import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/arcana.db');

let db;
export function initDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const schema = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}
export function getDb() { return db; }