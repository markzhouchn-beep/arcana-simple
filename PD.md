# ARCANA Simple — 产品文档 (PD)

> 能抽牌、能付钱、能买会员、有服务。不想多。

## 1. 原则

只做 6 件事：免费抽 1 张、付费解读、买会员、登录、塔罗大全、管理后台。

## 2. 路由

用户端：`/` `/draw` `/cards` `/cards/:slug` `/pay` `/pay/return` `/me` `/login`  
管理端：`/admin` `/admin/orders`（独立账号）

## 3. 定价

单次 ¥1.9/¥3.9/¥9.9；会员 银月¥19.9/月 金月¥39.9/月；免费每天 1 次 Yes/No。

## 4. 订单状态机（支付失败可重试）

```
pending → paying → paid → interpreting → done
       ↘ failed（可 retry-pay，上限 5 次）
paid 后解读失败 → interpret_failed（可 retry-ai，上限 3 次）
cancelled / refunded / expired
```

| 状态 | 含义 | 用户可操作 |
|------|------|------------|
| pending | 待支付 | 去支付 / 取消 |
| paying | 已跳转支付渠道 | 等待回调 |
| paid | 已到账 | 自动进解读队列 |
| interpreting | AI 生成中 | 轮询等待 |
| done | 完成 | 看解读 |
| failed | 支付失败/关闭 | **重试支付** |
| interpret_failed | AI 失败 | **重试解读** |
| cancelled | 用户取消 | — |

字段：`fail_reason`、`retry_count`、`updated_at`。

API：
- `GET /api/orders/:id` / `GET /api/draw/result/:orderId` — 轮询
- `POST /api/orders/:id/retry-pay` — 支付重试
- `POST /api/orders/:id/retry-ai` — 解读重试

## 5. AI 降级方案（异步 + 轮询，不白屏）

1. 支付成功（notify/capture）→ `enqueueInterpretation` → draw.status=`queued`
2. 后台 `processDraw`：`generating` → 调 API
3. API 成功 → `ready` + 写 interpretation；订单 `done`
4. API 失败 → **本地牌意库拼装简版**（source=fallback），仍标记 ready，用户至少有内容
5. 极端异常 → `interpret_failed`，前端显示「重新生成解读」
6. 前端 `/pay/return` 每 2s 轮询，最多 60 次（2 分钟）

**不采用**纯「系统繁忙」白屏；优先降级内容，再给重试按钮。

## 6. 支付关键修复

1. 汇率：`toCNY = amount / rate`
2. PayPal 重开单同步 `paypal_order_id`
3. `.env` 必填 `PAYPAL_WEBHOOK_ID`
4. 支付宝 query 解包 `alipay_trade_query_response`
5. 会员自助购买打通
6. 时间戳统一毫秒

## 7. SEO

78 张 `/cards/:slug`；22 大阿卡纳已种满（`scripts/seed_major.js`）。

## 8. 上线节奏

第 1 周抽牌+支付宝+AI轮询+登录+后台；第 2 周会员+PayPal+SEO；第 3 周补小阿卡纳+打磨。
