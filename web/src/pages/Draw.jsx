import { useState } from 'react';
import { api } from '../api';
export default function Draw(){
  const [res,setRes]=useState(null);
  const free=async()=>{ const r=await api('/api/draw/free'); setRes(r); };
  return (<div className="p-6 max-w-md mx-auto">
    <button onClick={free} className="px-6 py-2 bg-black text-white rounded">免费抽一张</button>
    {res && <div className="mt-6"><h2 className="text-xl">{res.card?.name_cn}</h2><p className="mt-2 text-gray-600">{res.text}</p></div>}
  </div>);
}