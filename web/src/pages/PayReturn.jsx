import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

/**
 * 支付回跳页：轮询订单/解读状态，避免白屏
 * - poll=true 时每 2s 查一次，最多 60 次（2 分钟）
 * - 失败可重试支付或重试 AI
 */
export default function PayReturn() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('正在确认支付…');
  const tries = useRef(0);

  useEffect(() => {
    if (!orderId) { setMsg('缺少订单号'); return; }
    let alive = true;
    const tick = async () => {
      try {
        const r = await api('/api/draw/result/' + orderId);
        if (!alive) return;
        setData(r);
        if (r.interpretation) {
          setMsg('解读已生成');
          return;
        }
        if (r.orderStatus === 'failed') {
          setMsg('支付未完成，可重试');
          return;
        }
        if (r.canRetryAi) {
          setMsg('解读生成失败，可重试');
          return;
        }
        if (r.poll && tries.current < 60) {
          setMsg(r.orderStatus === 'interpreting' || r.drawStatus === 'generating'
            ? '正在生成解读…'
            : '支付确认中…');
          tries.current += 1;
          setTimeout(tick, 2000);
        } else if (tries.current >= 60) {
          setMsg('处理较慢，请稍后在「我的」查看，或点击重试');
        }
      } catch {
        if (alive && tries.current < 60) {
          tries.current += 1;
          setTimeout(tick, 2000);
        }
      }
    };
    tick();
    return () => { alive = false; };
  }, [orderId]);

  const retryPay = async () => {
    await api('/api/orders/' + orderId + '/retry-pay', { method: 'POST' });
    location.href = '/pay?orderId=' + orderId;
  };
  const retryAi = async () => {
    setMsg('重新生成中…');
    tries.current = 0;
    await api('/api/orders/' + orderId + '/retry-ai', { method: 'POST' });
    // 重新触发轮询
    setData(null);
    setTimeout(() => location.reload(), 500);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">支付结果</h1>
      <p className="text-gray-600 mb-4">{msg}</p>
      {data?.interpretation && (
        <div className="whitespace-pre-wrap border rounded p-4 bg-gray-50 text-sm">{data.interpretation}</div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {data?.canRetryPay && (
          <button onClick={retryPay} className="px-4 py-2 bg-blue-600 text-white rounded">重新支付</button>
        )}
        {data?.canRetryAi && (
          <button onClick={retryAi} className="px-4 py-2 bg-amber-600 text-white rounded">重新生成解读</button>
        )}
        <Link to="/me" className="px-4 py-2 border rounded">我的订单</Link>
        <Link to="/" className="px-4 py-2 text-gray-500">回首页</Link>
      </div>
    </div>
  );
}
