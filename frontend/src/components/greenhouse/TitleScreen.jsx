import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import GreenhouseScene from './GreenhouseScene.jsx';
import './styles/title-screen.css';

const DEFAULT_SETTINGS = { textSize: 'standard', reducedMotion: false };
const SKULL_DIALOGUES = [
  "「向外看的人是在做夢；向內看的人才能覺醒。」Carl Jung",
  "「知人者智，自知者明。勝人者有力，自勝者強。」老子",
  "「當我們已經無法改變某種處境時，真正的挑戰便是改變自己。」Victor Frankl",
  "「一個人只要有了活下去的理由，便幾乎能承受任何處境。」Friedrich Nietzsche",
];
export function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem('greenhouse-ui-settings-v1') || 'null');
    return { textSize: value?.textSize === 'large' ? 'large' : 'standard', reducedMotion: value?.reducedMotion === true };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function Overlay({ title, eyebrow, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const panel = ref.current;
    panel.focus();
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button:not(:disabled), input, a[href]')];
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first?.focus(); }
    }
    panel.addEventListener('keydown', keydown);
    return () => { panel.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className={`gh-overlay${wide ? ' gh-settings-layer' : ''}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`gh-dialog${wide ? ' gh-config' : ''}`} role="dialog" aria-modal="true" aria-labelledby="gh-dialog-title" tabIndex={-1} ref={ref}>
      <button className="gh-close" onClick={onClose} aria-label="關閉視窗"><X size={21}/></button>
      {eyebrow && <p className="gh-kicker">{eyebrow}</p>}<h2 id="gh-dialog-title">{title}</h2>{children}
      <button className="gh-back" onClick={onClose}><ArrowLeft size={15}/> 返回主選單</button>
    </section>
  </div>;
}

export default function TitleScreen({ onStart, onContinue, hasSave, onBackend, settings, onSettings }) {
  const [lit, setLit] = useState(false);
  const [pull, setPull] = useState(0);
  const [panel, setPanel] = useState(null);
  const [category, setCategory] = useState('system');
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [settingsNotice, setSettingsNotice] = useState('設定會自動儲存在這個瀏覽器。');
  const [skullDialogue, setSkullDialogue] = useState(null);
  const [dialogueVisible, setDialogueVisible] = useState(false);
  
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const closePanel = useRef(() => setPanel(null)).current;
  useEffect(() => {
    const syncFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    
    document.addEventListener('fullscreenchange', syncFullscreen);
  
    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  function showRandomSkullDialogue() {
    const choices = SKULL_DIALOGUES.filter(
      dialogue => dialogue !== skullDialogue
    );

    const randomIndex = Math.floor(Math.random() * choices.length);

    setSkullDialogue(choices[randomIndex]);
    setDialogueVisible(true);
  }
  useEffect(() => {
    if (!dialogueVisible) return;

    const timer = setTimeout(() => {
      setDialogueVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [dialogueVisible, skullDialogue]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setSettingsNotice('目前瀏覽器無法切換全螢幕。'); }
  }
  function resetSettings() {
    const saved = onSettings({ ...DEFAULT_SETTINGS });
    setSettingsNotice(saved ? '已恢復預設設定。' : '已恢復預設；瀏覽器無法保存設定。');
  }
  function changeSetting(key, value) {
    const saved = onSettings({ ...settings, [key]: value });
    setSettingsNotice(saved ? '設定已儲存。' : '設定已套用；瀏覽器無法保存，重新整理後會恢復預設。');
  }
  function release(event) {
    if (!drag.current) return;
    const distance = event.clientY - drag.current.y;
    if (distance > 28) { suppressClick.current = true; setLit(current => !current); }
    drag.current = null;
    setPull(0);
  }
  return <main className={`gh-title${lit ? ' is-lit' : ''}${pull > 0 ? ' is-pulling' : ''}`}>
    <div className="gh-reveal" inert={!lit || panel !== null}>
      <GreenhouseScene/>
      <div className="gh-scene-shade"/>
      <div className="gh-hospital-light"/>
      <button className="gh-skull" type="button" onClick={showRandomSkullDialogue} aria-label="Berbicara dengan tengkorak" style={{ zIndex: 3 }}>
        <img src="/assets/backgrounds/test-skull.png" alt="" draggable="false" />
      </button>
      <img className="gh-flower" src="/assets/backgrounds/flower-ground.png" alt="" aria-hidden="true"  style={{
      position: "absolute",
      bottom: "-40px",
      left: 0,
      width: "135%",
      height: "32vh",
      objectFit: "cover",
      objectPosition: "center bottom",
      filter: "brightness(0.6) saturate(0.45)",
      zIndex: 2,
      pointerEvents: "none"
      }}/>   
      {skullDialogue && (
      <div
        className={`gh-skull-dialogue ${
          dialogueVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <button
          className="gh-skull-dialogue-close"
          onClick={() => setDialogueVisible(false)}
          aria-label="Close dialogue"
        >
          ×
        </button>

        <p>{skullDialogue}</p>
      </div>
  )}

      <div className="gh-main gh-emerge">
        <h1>植心溫室</h1>
        <nav className="gh-menu" aria-label="遊戲主選單" onKeyDown={event => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
          const index = items.indexOf(document.activeElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }}>
          <button className="gh-menu-item gh-start" onClick={() => setPanel('start')}>開始遊戲</button>
          <button className="gh-menu-item" disabled={!hasSave} title={!hasSave ? '尚無本機存檔' : '讀取本機存檔'} onClick={onContinue}>繼續遊戲</button>
          <button className="gh-menu-item" onClick={() => setPanel('settings')}>遊戲設定</button>
          <button className="gh-menu-item" onClick={() => setPanel('about')}>關於遊戲</button>
        </nav>
      </div>
    </div>
    <div className="gh-lamp" style={{'--pull':`${pull}px`}} inert={panel !== null}>
      <div className="gh-lamp-bulb"/><div className="gh-lamp-halo"/>
      <button className="gh-pull-switch" aria-label={lit ? '拉動吊燈開關，關閉燈光' : '拉動吊燈開關，點亮溫室'}
        onPointerDown={event => { if (event.button !== 0) return; suppressClick.current = false; drag.current = { y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { if (drag.current) setPull(Math.min(120, Math.max(0, event.clientY - drag.current.y))); }}
        onPointerUp={release}
        onPointerCancel={() => { drag.current = null; setPull(0); }}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setLit(current => !current); }}>
        <span className="gh-pull-cord"/><span className="gh-rope-knot"/>
      </button>
    </div>
    <div className="gh-dark-hint" aria-hidden={lit}><span className="gh-hint-line"/><small>向下拉動</small></div>
    <p className="gh-sr" role="status">{lit ? '溫室已點亮，遊戲主選單已顯現。' : '溫室裡一片寂靜。請拉動吊燈開關，或按 Tab 選取開關後按 Enter 點亮溫室。'}</p>
    {panel === 'settings' && <Overlay title="遊戲設定" onClose={closePanel} wide>
      <div className="gh-config-layout">
        <div className="gh-config-tabs" role="tablist" aria-label="設定分類" aria-orientation="vertical">
          { [['system','系統'],['text','文字'],['controls','操作']].map(([id,label]) => <button key={id} role="tab" id={`settings-tab-${id}`} aria-selected={category === id} aria-controls={`settings-panel-${id}`} tabIndex={category === id ? 0 : -1} onClick={() => setCategory(id)} onKeyDown={event => {
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
            event.preventDefault();
            const ids = ['system','text','controls'];
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (ids.indexOf(category) + (['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1) + 3) % 3;
            setCategory(ids[next]); document.getElementById(`settings-tab-${ids[next]}`)?.focus();
          }}>{label}</button>) }
        </div>
        <div className="gh-config-body">
          <div role="tabpanel" id={`settings-panel-${category}`} aria-labelledby={`settings-tab-${category}`}>
            {category === 'system' && <>
              <div className="gh-setting gh-toggle-row"><div><span>顯示模式</span><p>{document.fullscreenEnabled ? '切換視窗或全螢幕顯示。' : '目前瀏覽器使用視窗模式。'}</p></div><button className="gh-display-control" disabled={!document.fullscreenEnabled} onClick={toggleFullscreen}>{fullscreen ? '全螢幕' : '視窗'}</button></div>
              <div className="gh-setting gh-toggle-row"><div><label htmlFor="reduce-motion">減少動態效果</label><p>縮短開燈轉場，停止場景與拉繩動態。</p></div><button id="reduce-motion" role="switch" aria-checked={settings.reducedMotion} aria-label="減少動態效果" className="gh-toggle" onClick={() => changeSetting('reducedMotion',!settings.reducedMotion)}><span/></button></div>
            </>}
            {category === 'text' && <>
              <fieldset className="gh-setting"><legend>文字大小</legend><p>套用至選單與劇情閱讀畫面。</p><div className="gh-segment">{[['standard','標準'],['large','較大']].map(([value,label])=><button key={value} aria-pressed={settings.textSize === value} onClick={() => changeSetting('textSize',value)}>{label}{settings.textSize === value && <Check size={14}/>}</button>)}</div></fieldset>
              <div className="gh-reading-sample"><small>閱讀預覽</small><p>療養院裡，燈還亮著。</p></div>
            </>}
            {category === 'controls' && <><div className="gh-help-row"><span>點亮／關閉吊燈</span><span>向下拉繩 或 點擊</span></div><div className="gh-help-row"><span>切換選單</span><span>↑ ↓ ／ Tab</span></div><div className="gh-help-row"><span>確認</span><span>Enter ／ 空白鍵</span></div><div className="gh-help-row"><span>關閉視窗</span><span>Esc</span></div></>}
          </div>
          <button className="gh-config-reset" onClick={resetSettings}>恢復預設設定</button>
          <p className="gh-settings-notice" role="status">{settingsNotice}</p>
        </div>
      </div>
    </Overlay>}
    {panel === 'about' && <Overlay title="關於遊戲" onClose={closePanel}>
      <p className="gh-prose">《植心溫室》</p><p className="gh-prose">你將扮演新入職的「植心師」，走進一座隱蔽的療養院。這裡的人們，因心中的創傷而長出了奇異植物。</p><p className="gh-fine-print">開發中版本 · 正式劇情尚未開放</p><button className="gh-dev-entry" onClick={onBackend}>後端測試模式</button>
    </Overlay>}
    {panel === 'start' && <Overlay title="開始新遊戲" onClose={closePanel}>
      <p className="gh-prose">正式劇情製作中。<br/>目前將進入對話與存檔的流程預覽。</p><button className="gh-dialog-primary" onClick={onStart}>進入流程預覽 <ArrowRight size={17}/></button>
    </Overlay>}
  </main>;
}
