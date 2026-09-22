// 1 外币 = ? 人民币。除法换算，禁止乘法。
export const RATES = { USD: 7.1, EUR: 7.7, GBP: 9.0, JPY: 0.047, HKD: 0.91, TWD: 0.22 };

export function toCNY(amount, currency) {
  if (currency === 'CNY') return amount;
  const r = RATES[currency];
  if (!r) throw new Error('unsupported currency: ' + currency);
  return Math.round((amount / r) * 100) / 100;
}