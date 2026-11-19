import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Eye, EyeOff, History, Menu, Save, X } from 'lucide-react';
import { story } from './demo-story.js';
import GreenhouseScene from './GreenhouseScene.jsx';
import './styles/story-game.css';

function SceneCaption({ scene }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4800);
    return () => clearTimeout(timer);
  }, []);
  return visible ? <p className="vn-location">{scene}</p> : null;
}

function StoryOverlay({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const panel = ref.current;
    panel.focus();
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
      if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === panel)) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && (document.activeElement === buttons.at(-1) || document.activeElement === panel)) { event.preventDefault(); buttons[0]?.focus(); }
    }
    panel.addEventListener('keydown', keydown);
    return () => { panel.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="vn-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="vn-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="vn-modal-title" tabIndex={-1}>
      <header><h2 id="vn-modal-title">{title}</h2><button onClick={onClose} aria-label="關閉視窗"><X size={21}/></button></header>{children}
    </section>
  </div>;
}

function Dialogue({ node, onChoice, reducedMotion, onExit }) {
  const [count, setCount] = useState(reducedMotion ? node.text.length : 0);
  const complete = count >= node.text.length;
  useEffect(() => {
    if (reducedMotion || complete) return;
    const timer = setInterval(() => setCount(value => Math.min(value + 1, node.text.length)), 35);
    return () => clearInterval(timer);
  }, [node.text, reducedMotion, complete]);
  const revealed = complete || reducedMotion;
  return <>
    <section className={`vn-choices${revealed ? ' is-ready' : ''}`} aria-label="劇情選項" inert={!revealed}>
      {node.options.map((option, index) => <button key={index} onClick={() => onChoice(option)}><span className="vn-choice-mark" aria-hidden="true"/><span>{option.label}</span><ChevronRight size={15} aria-hidden="true"/></button>)}
    </section>
    <section className="vn-dialogue" aria-label="對話">
      <div className="vn-avatar" aria-label="角色頭像位置">
        <div className="vn-avatar-image">
          {node.avatar ? <img src={node.avatar} alt={`${node.speaker || '角色'}的頭像`}/> : <svg className="vn-avatar-placeholder" viewBox="0 0 120 150" fill="none" aria-hidden="true"><path d="M60 24C43 24 36 39 39 55C40 64 45 70 49 73V83C35 88 25 99 22 121M60 24C77 24 84 39 81 55C80 64 75 70 71 73V83C85 88 95 99 98 121"/><path d="M49 83Q60 92 71 83M45 37Q55 41 62 33Q68 45 81 45"/></svg>}
        </div>

      </div>
      <div className="vn-dialogue-content">
      <div className="vn-speaker"><span aria-hidden="true"/>{node.speaker || '旁白'}</div>
      <button className="vn-dialogue-text" aria-label={revealed ? undefined : '顯示完整對話'} onClick={() => setCount(node.text.length)} disabled={revealed}>
        <span aria-hidden="true">{revealed ? node.text : node.text.slice(0, count)}<span className="vn-caret" hidden={revealed}/></span>
        <span className="vn-sr">{node.text}</span>
      </button>
      <div className="vn-dialogue-foot"><span>{!revealed ? '點擊對話，顯示全文' : node.options.length ? '請選擇回應' : '本段預覽結束'}</span><span className="vn-dialogue-diamond" aria-hidden="true"/></div>
      {revealed && node.options.length === 0 && <button className="vn-end-button" onClick={onExit}>返回主選單 <ChevronRight size={14}/></button>}
      </div>
    </section>
  </>;
}

// 本機介面模板；正式後端的 AP、病患數值與劇情條件仍由後端模式管理。
export default function StoryGame({ progress, onChoice, onSave, onLoad, hasSave, onExit, onReset, message, settings }) {
  const node = story[progress.node];
  const [panel, setPanel] = useState(null);
  const [hiddenUI, setHiddenUI] = useState(false);
  const closePanel = useRef(() => setPanel(null)).current;
  const showButton = useRef(null);
  const hideButton = useRef(null);
  const previousHidden = useRef(false);
  const reducedMotion = settings?.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const wasHidden = previousHidden.current;
    previousHidden.current = hiddenUI;
    if (!hiddenUI) { if (wasHidden) hideButton.current?.focus(); return; }
    showButton.current?.focus();
    function keydown(event) {
      if (event.key === 'Escape') setHiddenUI(false);
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [hiddenUI]);
  const history = progress.history.filter(entry => entry && story[entry.from]);
  if (!node) return <main className="vn-game"><div className="vn-error"><p>無法讀取目前劇情。</p><button onClick={onReset}>重新開始</button></div></main>;
  return <main className={`vn-game${hiddenUI ? ' ui-hidden' : ''}`}>
    <div className="vn-stage" aria-hidden="true">
      {node.background ? <img className="vn-background" src={node.background} alt=""/> : <GreenhouseScene/>}
      <div className="vn-scene-light"/>
      {node.portrait && <img className="vn-portrait" src={node.portrait} alt=""/>}
      <div className="vn-vignette"/>
    </div>
    <div className="vn-interface" inert={hiddenUI || panel !== null}>
      <SceneCaption key={node.scene} scene={node.scene}/>
      <header className="vn-topbar">
        <div className="vn-toolbar"><button onClick={() => setPanel('history')}><History size={15}/>紀錄</button><button onClick={onSave}><Save size={15}/>存檔</button><button ref={hideButton} onClick={() => setHiddenUI(true)} aria-label="隱藏介面"><EyeOff size={16}/></button><button onClick={() => setPanel('menu')}><Menu size={17}/>選單</button></div>
      </header>
      {message && <p className="vn-toast" role={message.includes('無法') ? 'alert' : 'status'}>{message.includes('無法') ? <X size={13}/> : <Check size={13}/>} {message}</p>}
      <Dialogue key={`${progress.node}-${progress.history.length}`} node={node} onChoice={onChoice} reducedMotion={reducedMotion} onExit={onExit}/>
    </div>
    {hiddenUI && <button className="vn-show-ui" ref={showButton} onClick={() => setHiddenUI(false)}><Eye size={16}/> 顯示介面 <small>Esc</small></button>}
    {panel === 'history' && <StoryOverlay title="對話紀錄" onClose={closePanel}>
      <div className="vn-history">{history.map((entry,index) => <article key={index}><span>{story[entry.from].speaker || '旁白'}</span><p>{story[entry.from].text}</p><small><ChevronRight size={12}/>{entry.label}</small></article>)}<article className="is-current"><span>{node.speaker || '旁白'}<small>目前對話</small></span><p>{node.text}</p></article></div>
      <button className="vn-modal-back" onClick={closePanel}><ArrowLeft size={14}/> 返回劇情</button>
    </StoryOverlay>}
    {panel === 'menu' && <StoryOverlay title="暫停" onClose={closePanel}>
      <div className="vn-pause-menu"><button onClick={closePanel}>繼續劇情</button><button onClick={() => { onSave(); closePanel(); }}>儲存進度</button><button disabled={!hasSave} onClick={() => { onLoad(); closePanel(); }}>讀取存檔</button><button onClick={() => { onReset(); closePanel(); }}>重新開始</button><button onClick={onExit}>返回主選單</button></div>
    </StoryOverlay>}
  </main>;
}
