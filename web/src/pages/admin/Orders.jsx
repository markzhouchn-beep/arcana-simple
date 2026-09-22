import { useEffect,useState } from 'react';
import { api } from '../../api';
export default function AdminOrders(){
  const [list,setList]=useState([]);
  useEffect(()=>{ const t=localStorage.getItem('adminToken'); fetch((import.meta.env.VITE_API||'http://localhost:3001')+'/api/admin/orders',{headers:{Authorization:'Bearer '+t}}).then(r=>r.json()).then(setList); },[]);
  return (<div className="p-6"><h1 className="text-xl mb-4">订单</h1><table className="w-full text-sm"><thead><tr><th>编号</th><th>金额</th><th>状态</th><th>方式</th></tr></thead><tbody>{list.map(o=><tr key={o.id}><td>{o.id.slice(0,8)}</td><td>¥{o.amount_cny}</td><td>{o.status}</td><td>{o.payment_method}</td></tr>)}</tbody></table></div>);
}