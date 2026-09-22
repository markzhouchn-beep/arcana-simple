// 先种 22 大阿卡纳到 cards 表，每牌 upright/reversed/love/career/wealth ≥200 字
// 运行：node scripts/seed_major.js
import Database from 'better-sqlite3';
const db = new Database('data/arcana.db');
const MAJOR = [
  ['the-fool','愚者','The Fool','新的开始、净白、冒险','迫不得已、败家、计划不足'],
  // …其余 20 张同款格式补全
];
const ins = db.prepare('INSERT OR REPLACE INTO cards (slug,name_cn,name_en,arcana,upright,reversed,love,career,wealth) VALUES (?,?,?,\'major\',?,?,?,?,?)');
for (const [slug,cn,en,up,rev] of MAJOR) ins.run(slug,cn,en,up,rev,up+'。感情上代表新的可能性。',up+'。事业上适合重启。',up+'。财运上属于投资阶段。');
console.log('seeded', MAJOR.length);