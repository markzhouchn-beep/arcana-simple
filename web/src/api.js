const BASE = import.meta.env.VITE_API || 'http://localhost:3001';
export async function api(path, opt = {}) {
  const t = localStorage.getItem('token');
  const r = await fetch(BASE + path, { ...opt, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}), ...opt.headers } });
  return r.json();
}