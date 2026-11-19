import { useRef, useState } from 'react';
import TitleScreen, { readSettings } from './TitleScreen.jsx';
import StoryGame from './StoryGame.jsx';
import BackendGame from '../../components/BackendGame.jsx';
import { story, START_NODE } from './demo-story.js';

const STORAGE_KEY = 'greenhouse-ui-progress-v1';
function freshProgress() { return { node: START_NODE, history: [] }; }
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && story[saved.node] && Array.isArray(saved.history)) return saved;
  } catch { /* ignore invalid browser data */ }
  return freshProgress();
}
export default function App() {
  const [settings, setSettings] = useState(readSettings);
  const [screen, setScreen] = useState('home');
  const [progress, setProgress] = useState(freshProgress);
  const [message, setMessage] = useState('');
  // 後端測試模式的進度只保存在 React 記憶體，不寫入 localStorage
  const [backendSession, setBackendSession] = useState(null);
  // 後端請求的有效代數：離開後端畫面或建立新局時遞增，舊請求的回應不得覆蓋目前進度
  const backendRequestGeneration = useRef(0);
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
  function updateSettings(next) {
    setSettings(next);
    try { localStorage.setItem('greenhouse-ui-settings-v1', JSON.stringify(next)); return true; }
    catch { return false; }
  }
  let saved = false;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    saved = Boolean(value && story[value.node] && Array.isArray(value.history));
  } catch { /* 沒有可用的本機存檔 */ }
  return <div className={`greenhouse-app text-${settings.textSize}${settings.reducedMotion ? ' reduce-motion' : ''}`}>
    {screen === 'backend' ? <BackendGame session={backendSession} onSession={setBackendSession} requestGeneration={backendRequestGeneration} onExit={() => setScreen('home')}/>
      : screen === 'game' ? <StoryGame progress={progress} onChoice={choose} onSave={save} onLoad={resume} hasSave={saved} onExit={() => setScreen('home')} onReset={reset} message={message} settings={settings}/>
      : <TitleScreen onStart={start} onContinue={resume} hasSave={saved} onBackend={() => setScreen('backend')} settings={settings} onSettings={updateSettings}/>}
  </div>;
}
