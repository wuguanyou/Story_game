import { useState } from 'react';
import { BookOpen, Play, Save, Server, Users } from 'lucide-react';
import Game from './components/Game.jsx';
import { story, START_NODE, INITIAL_PROGRESS } from './stories/index.js';

// 主題未定，先使用中性文案及介面；不要把正式劇情寫死在這裡。
const STORAGE_KEY = 'interactive-story-progress-v1';
function freshProgress() { return { node: START_NODE, history: [] }; }
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && story[saved.node] && Array.isArray(saved.history)) return saved;
  } catch { /* ignore invalid browser data */ }
  return freshProgress();
}
export default function App() {
  const [screen, setScreen] = useState('home');
  const [progress, setProgress] = useState(freshProgress);
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('尚未測試');
  function choose(option) {
    if (!story[option.next]) { setMessage('找不到目標劇情節點，請檢查 next。'); return; }
    setProgress(p => ({ node: option.next, history: [...p.history, {from:p.node, next:option.next, label:option.label}] }));
    setMessage('');
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); setMessage('進度已儲存在此瀏覽器'); }
    catch { setMessage('無法儲存，請檢查瀏覽器設定'); }
  }
  function start() { setProgress(freshProgress()); setMessage(''); setScreen('game'); }
  function resume() { setProgress(loadProgress()); setMessage(''); setScreen('game'); }
  function reset() { if (window.confirm('重新開始目前劇情？已儲存的資料不會被清除。')) { setProgress(freshProgress()); setMessage('已重新開始'); } }
  async function testApi() {
    try { const r = await fetch('/api/health'); if (!r.ok) throw Error('failed'); const data=await r.json(); setApiStatus(data.status==='ok'?'連線正常':'回應異常'); }
    catch { setApiStatus('無法連線（示範劇情仍可操作）'); }
  }
  if (screen === 'game') return <Game progress={progress} onChoice={choose} onSave={save} onExit={() => setScreen('home')} onReset={reset} message={message}/>;
  return <div className="site"><header className="topbar"><div className="container topbar-inner"><div className="brand">互動劇情遊戲 <span>Project Starter</span></div><span className="status">主題討論中 · v0.2</span></div></header>
    <main className="container"><section className="intro"><div className="eyebrow">TEAM PROJECT / STORY GAME</div><h1>先把遊戲框架做好，<br/>故事由我們一起決定。</h1><p>可擴充的互動劇情網站基礎：將「劇情內容」和「遊戲呈現」分開，方便小組同時開發。目前所有場景與對話皆為中性示範資料。</p><div className="actions"><button className="primary" onClick={start}><Play size={18}/> 開始示範劇情</button><button className="secondary" onClick={resume}><BookOpen size={18}/> 讀取本機存檔</button></div></section>
    <section className="grid"><article className="panel"><BookOpen/><h2>劇情內容</h2><p>集中在 <code>frontend/src/stories/</code>，新增章節時不需修改遊戲畫面。</p></article><article className="panel"><Save/><h2>存檔原型</h2><p>先用 localStorage 測試流程；正式跨裝置存檔留給後端與資料庫。</p></article><article className="panel"><Users/><h2>小組協作</h2><p>README、開發日誌、協作規範與決策紀錄都在專案中。</p></article></section>
    <section className="api-panel"><div><Server size={20}/><span>後端 API 狀態：{apiStatus}</span></div><button className="secondary" onClick={testApi}>測試連線</button></section></main><footer className="container footer">互動劇情遊戲開發框架 · 專案名稱、題材與角色設定皆待小組討論</footer></div>
}
