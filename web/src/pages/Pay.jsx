import { api } from '../api';
export default function Pay(){
  const go=(method)=>{ api('/api/pay/'+method+'/create',{method:'POST',body:JSON.stringify({orderId:localStorage.getItem('orderId')})}).then(r=>{ if(r.approveUrl)location.href=r.approveUrl; else document.body.innerHTML=r; }); };
  return (<div className="p-6 max-w-md mx-auto space-y-3">
    <button onClick={()=>go('alipay')} className="w-full py-3 bg-blue-500 text-white rounded">支付宝</button>
    <button onClick={()=>go('paypal')} className="w-full py-3 bg-yellow-400 rounded">PayPal</button>
  </div>);
}