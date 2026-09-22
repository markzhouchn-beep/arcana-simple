# ARCANA Simple

极简版塔罗站：抽牌 + 支付宝/PayPal + 会员 + SEO 大全。用户端 `/` 与 管理端 `/admin` 入口独立。

## 启动

```bash
cp .env.example .env   # 填入密钥
cd server && npm i && npm run dev
cd web && npm i && npm run dev
```

## 目录

- `server/` Express 后端
- `web/` React 前端（含 `/admin`）
- `schema.sql` 数据库
- `PD.md` 产品文档

详见 `PD.md`。