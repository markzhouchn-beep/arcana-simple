// AI 解读：异步生成 + 降级
// - 正常：调 OpenAI/兼容接口
// - 失败：写 interpret_failed，前端可重试；不白屏
// - 降级：用本地牌意库拼装简版解读，保证用户付费后至少有内容

import { getDb } from '../db.js';

const SYSTEM = `你是星语塔罗解读师。根据用户问题和抽到的牌（含正逆位），给出温暖、具体、可行动的解读。
结构：1) 整体能量 2) 逐张简释 3) 对问题的直接回答 4) 一句行动建议。
语言：简体中文，语气真诚，避免玄乎空话。`;

export async function generateInterpretation({ question, cards }) {
  const cardText = cards.map((c, i) =>
    `第${i + 1}张：${c.name_cn}（${c.orientation === 'reversed' ? '逆位' : '正位'}）`
  ).join('\n');

  const userMsg = `问题：${question || '请给我今日指引'}
抽到的牌：
${cardText}`;

  // 1) 尝试真实 API
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });
      if (!r.ok) throw new Error('openai ' + r.status);
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return { ok: true, text, source: 'ai' };
    } catch (err) {
      console.error('[ai] API failed:', err.message);
    }
  }

  // 2) 降级：本地牌意拼装（保证付费用户不白屏）
  const parts = cards.map((c, i) => {
    const body = c.orientation === 'reversed' ? (c.reversed || c.upright) : (c.upright || '');
    const love = c.love || '';
    return `【第${i + 1}张 · ${c.name_cn}${c.orientation === 'reversed' ? '（逆位）' : ''}】\n${body}\n${love ? '感情提示：' + love.slice(0, 80) + '…' : ''}`;
  });
  const fallback =
    `（系统繁忙，已为你生成牌意简版解读）\n\n` +
    `关于「${question || '今日指引'}」：\n\n` +
    parts.join('\n\n') +
    `\n\n建议：先静下心感受这几张牌给你的第一印象，再对照生活里正在发生的事。`;
  return { ok: true, text: fallback, source: 'fallback' };
}

/** 异步任务：把 paid 订单变成解读（queued → generating → ready / failed） */
export async function processDraw(drawId) {
  const db = getDb();
  const draw = db.prepare('SELECT * FROM draws WHERE id=?').get(drawId);
  if (!draw || draw.status === 'ready') return;

  db.prepare(`UPDATE draws SET status='generating', updated_at=? WHERE id=?`).run(Date.now(), drawId);
  db.prepare(`UPDATE orders SET status='interpreting', updated_at=? WHERE id=?`).run(Date.now(), draw.order_id);

  try {
    const cardIds = JSON.parse(draw.card_ids || '[]');
    const orientations = JSON.parse(draw.orientation || '[]');
    const cards = cardIds.map((id, i) => {
      const c = db.prepare('SELECT * FROM cards WHERE id=?').get(id) || { name_cn: '未知', upright: '', reversed: '' };
      return { ...c, orientation: orientations[i] || 'upright' };
    });

    const order = db.prepare('SELECT question FROM orders WHERE id=?').get(draw.order_id);
    const result = await generateInterpretation({ question: order?.question, cards });

    db.prepare(`UPDATE draws SET status='ready', interpretation=?, error_message=NULL, updated_at=? WHERE id=?`)
      .run(result.text, Date.now(), drawId);
    db.prepare(`UPDATE orders SET status='done', updated_at=? WHERE id=?`).run(Date.now(), draw.order_id);
    console.log(`[ai] draw ${drawId} ready via ${result.source}`);
  } catch (err) {
    console.error('[ai] processDraw error:', err.message);
    db.prepare(`UPDATE draws SET status='failed', error_message=?, retry_count=retry_count+1, updated_at=? WHERE id=?`)
      .run(err.message, Date.now(), drawId);
    db.prepare(`UPDATE orders SET status='interpret_failed', updated_at=? WHERE id=?`).run(Date.now(), draw.order_id);
  }
}

/** 支付成功后触发：创建 draw 记录并异步生成 */
export function enqueueInterpretation(orderId) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  if (!order || order.type !== 'draw') return null;

  // 已有 draw 则不重复创建
  let draw = db.prepare('SELECT * FROM draws WHERE order_id=?').get(orderId);
  if (!draw) {
    const n = order.card_count || 1;
    const deck = Array.from({ length: 78 }, (_, i) => i + 1);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const cardIds = shuffled.slice(0, n);
    const orientations = cardIds.map(() => (Math.random() < 0.3 ? 'reversed' : 'upright'));
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    db.prepare(`INSERT INTO draws (id,order_id,user_id,card_ids,orientation,card_count,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?, 'queued', ?, ?)`)
      .run(id, orderId, order.user_id, JSON.stringify(cardIds), JSON.stringify(orientations), n, Date.now(), Date.now());
    draw = db.prepare('SELECT * FROM draws WHERE id=?').get(id);
  }

  // 异步跑，不阻塞支付回调
  setImmediate(() => processDraw(draw.id).catch(e => console.error(e)));
  return draw;
}
