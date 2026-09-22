import crypto from 'crypto';

function sign(params, privateKey) {
  const str = Object.keys(params).filter(k => params[k] && !['sign','sign_type'].includes(k))
    .sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createSign('RSA-SHA256').update(str).end()
    .sign(privateKey, 'base64');
}

export function createWapPayForm({ appId, privateKey, notifyUrl, returnUrl, outTradeNo, totalAmount, subject }) {
  const biz = { out_trade_no: outTradeNo, total_amount: totalAmount.toFixed(2),
    subject, product_code: 'QUICK_WAP_WAY', timeout_express: '15m' };
  const params = { app_id: appId, method: 'alipay.trade.wap.pay', format: 'JSON',
    return_url: returnUrl, notify_url: notifyUrl, charset: 'utf-8',
    sign_type: 'RSA2', timestamp: new Date().toISOString().slice(0,19).replace('T',' '),
    version: '1.0', biz_content: JSON.stringify(biz) };
  params.sign = sign(params, privateKey);
  const inputs = Object.entries(params).map(([k,v]) =>
    `<input type="hidden" name="${k}" value="${v}"/>`).join('');
  return `<form id="p" action="https://openapi.alipay.com/gateway.do?charset=utf-8" method="POST">${inputs}</form><script>document.getElementById('p').submit();</script>`;
}

export function verifyNotify(params, publicKey) {
  const sign = params.sign; const copy = { ...params }; delete copy.sign; delete copy.sign_type;
  const str = Object.keys(copy).filter(k => copy[k]).sort().map(k => `${k}=${copy[k]}`).join('&');
  return crypto.createVerify('RSA-SHA256').update(str).end().verify(publicKey, sign, 'base64');
}

// 关键：解包嵌套字段 alipay_trade_query_response
export function parseQuery(body) {
  const r = body.alipay_trade_query_response || body;
  return { tradeStatus: r.trade_status, tradeNo: r.trade_no, totalAmount: Number(r.total_amount) };
}