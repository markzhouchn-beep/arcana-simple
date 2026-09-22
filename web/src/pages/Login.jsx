import { useState } from 'react';
import { api } from '../api';
export default function Login(){
  const [email,setEmail]=useState(''),[pw,setPw]=useState('');
  const go=async()=>{ const r=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password:pw})}); if(r.token){localStorage.setItem('token',r.token);location.href='/me';} };
  return (<div className="p-6 max-w-sm mx-auto space-y-3"><input className="border p-2 w-full" placeholder="邮箱" value={email} onChange={e=>setEmail(e.target.value)}/><input className="border p-2 w-full" type="password" placeholder="密码" value={pw} onChange={e=>setPw(e.target.value)}/><button onClick={go} className="w-full py-2 bg-black text-white rounded">登录</button></div>);
}