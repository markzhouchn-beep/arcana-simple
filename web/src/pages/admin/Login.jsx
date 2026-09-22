import { useState } from 'react';
import { api } from '../../api';
export default function AdminLogin(){
  const [u,setU]=useState(''),[p,setP]=useState('');
  const go=async()=>{ const r=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:u,password:p})}); if(r.token){localStorage.setItem('adminToken',r.token);location.href='/admin/orders';} };
  return (<div className="p-6 max-w-sm mx-auto"><h1 className="text-xl mb-4">管理后台</h1><input className="border p-2 w-full mb-2" placeholder="账号" value={u} onChange={e=>setU(e.target.value)}/><input className="border p-2 w-full mb-2" type="password" placeholder="密码" value={p} onChange={e=>setP(e.target.value)}/><button onClick={go} className="w-full py-2 bg-black text-white rounded">登录</button></div>);
}