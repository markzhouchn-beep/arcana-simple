import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
export default function Cards(){
  const [list,setList]=useState([]);
  useEffect(()=>{ api('/api/cards').then(setList); },[]);
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-4">塔罗大全</h1>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{list.map(c=>
      <Link key={c.id} to={`/cards/${c.slug}`} className="border rounded p-3 hover:bg-gray-50">{c.name_cn}</Link>)}</div></div>);
}