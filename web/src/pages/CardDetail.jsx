import { useEffect,useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
export default function CardDetail(){
  const {slug}=useParams(); const [c,setC]=useState(null);
  useEffect(()=>{ api('/api/cards/'+slug).then(setC); },[slug]);
  if(!c) return <div className="p-6">加载中…</div>;
  return (<div className="p-6 max-w-2xl mx-auto">
    <h1 className="text-3xl font-bold">{c.name_cn} <span className="text-gray-400 text-lg">{c.name_en}</span></h1>
    <section className="mt-4"><h2>正位</h2><p>{c.upright}</p></section>
    <section className="mt-4"><h2>逆位</h2><p>{c.reversed}</p></section>
    <section className="mt-4"><h2>感情</h2><p>{c.love}</p><h2>事业</h2><p>{c.career}</p><h2>财运</h2><p>{c.wealth}</p></section>
  </div>);
}