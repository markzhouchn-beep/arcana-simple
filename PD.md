# ARCANA Simple — 产品文档 (PD)

> 能抽牌、能付钱、能买会员、有服务。不想多。

## 1. 原则

只做 6 件事：免费抽 1 张、付费解读、买会员、登录、塔罗大全、管理后台。Oracle/邀请/社区全部砍。

## 2. 路由

用户端：`/` `/draw` `/cards` `/cards/:slug` `/pay` `/me` `/login`
管理端：`/admin` `/admin/orders` `/admin/cards`（独立账号，与用户完全分离）

## 3. 定价

单次 ¥1.9/¥3.9/¥9.9；会员 银月¥19.9/月 金月¥39.9/月；免费每天 1 次 Yes/No。

## 4. 数据库

见 `schema.sql`：users / cards / orders / draws / admins。

## 5. 支付关键修复

1. 汇率方向：`toCNY = amount / rate`（旧版乘法致命）
2. PayPal 重开 pending 单必须 `UPDATE paypal_order_id`
3. `.env` 必填 `PAYPAL_WEBHOOK_ID`
4. 支付宝 query 解包 `alipay_trade_query_response`
5. 会员自助购买打通（旧版 410）
6. 时间戳统一毫秒 `Date.now()`

## 6. SEO

78 张 `/cards/:slug`，每牌 ≥200 字正逆位 + FAQ 结构化数据 + sitemap。

## 7. 上线节奏

第 1 周抽牌+支付宝+AI+登录+后台；第 2 周会员+PayPal+22大阿卡纳；第 3 周补 56 小阿卡纳+修支付+上线。