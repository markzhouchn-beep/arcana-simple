const BASE = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function token() {
  const r = await fetch(BASE + '/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64') },
    body: 'grant_type=client_credentials' });
  return (await r.json()).access_token;
}

export async function createOrder({ amount, currency }) {
  const t = await token();
  const r = await fetch(BASE + '/v2/checkout/orders', {
    method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
      application_context: { return_url: process.env.PAYPAL_RETURN_URL, cancel_url: process.env.PAYPAL_RETURN_URL } }) });
  return r.json();
}

export async function captureOrder(orderId) {
  const t = await token();
  const r = await fetch(BASE + `/v2/checkout/orders/${orderId}/capture`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', Prefer: 'return=representation' } });
  return r.json();
}