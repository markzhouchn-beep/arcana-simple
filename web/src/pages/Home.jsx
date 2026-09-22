import { Link } from 'react-router-dom';
export default function Home(){return (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
    <h1 className="text-4xl font-bold">星语塔罗</h1>
    <p className="text-gray-500">抽一张、问一个、看一个答案。</p>
    <Link to="/draw" className="px-8 py-3 bg-black text-white rounded-full">抽一张</Link>
    <Link to="/cards" className="text-sm text-gray-400">塔罗大全 →</Link>
  </div>);
}