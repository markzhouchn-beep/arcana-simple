import { api } from '../api';
import { useEffect,useState } from 'react';
export default function Me(){
  const [u,setU]=useState(null);
  useEffect(()=>{ api('/api/auth/me').then(setU).catch(()=>{}); },[]);
  return <div className="p-6">{u? <p>会员：{u.tier}</p> : <a href="/login">登录</a>}</div>;
}