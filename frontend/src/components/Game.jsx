import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { story } from '../stories/index.js';
export default function Game({ progress, onChoice, onSave, onExit, onReset, message }) {
  const node = story[progress.node];
  if (!node) return <main className="game-layout"><p>找不到劇情節點：{progress.node}</p><button onClick={onReset}>重設進度</button></main>;
  return <main className="game-layout"><header className="game-bar"><button className="text-btn" onClick={onExit}><ArrowLeft size={17}/> 返回首頁</button><span>示範遊戲畫面</span><div className="toolbar"><button className="text-btn" onClick={onSave}><Save size={16}/> 存檔</button><button className="text-btn" onClick={onReset}><RotateCcw size={16}/> 重來</button></div></header>
    <section className="scene-placeholder"><span className="scene-label">場景圖片預留區</span><strong>{node.scene}</strong><small>素材可放在 frontend/public/assets/backgrounds/</small></section>
    <section className="dialogue-panel"><div className="speaker">{node.speaker}</div><p>{node.text}</p><div className="choices">{node.options.length ? node.options.map((o,i)=><button className="choice" key={`${progress.node}-${i}`} onClick={()=>onChoice(o)}><span>{i+1}.</span>{o.label}</button>) : <p className="ending">此分支已結束，請回主選單或重新開始。</p>}</div></section><p className="game-message" role="status">{message || '示範版本：尚未設定正式主題、角色或計分規則'}</p></main>;
}
