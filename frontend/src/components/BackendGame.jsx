import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, Moon, Play, RefreshCw } from 'lucide-react';
import { ApiError, createGame, describeApiError, getGame, sendAction } from '../api/gameApi.js';

const PATIENTS = ['A', 'B', 'C'];

// 後端測試模式：畫面只呈現後端回傳的狀態，遊戲規則一律由後端判斷。
// 進度只保存在 React 記憶體（由 App 持有），不寫入 localStorage。
export default function BackendGame({ session, onSession, onExit, requestGeneration }) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const controllerRef = useRef(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 離開畫面時讓尚未完成的請求全部失效。abort 只停止等待回應，
  // 伺服器可能已完成該操作；是否套用回應一律由 generation 判斷。
  useEffect(() => () => {
    requestGeneration.current += 1;
    controllerRef.current?.abort();
  }, [requestGeneration]);

  // 同一時間只允許一個請求；用 busyRef 擋住同一輪 render 內的連點。
  // 每個請求記下開始時的 generation，只有 generation 未變時才能更新進度或訊息。
  async function run(task, { invalidatePrevious = false } = {}) {
    if (busyRef.current) return;
    if (invalidatePrevious) requestGeneration.current += 1;
    const generation = requestGeneration.current;
    const isCurrent = () => requestGeneration.current === generation;
    const controller = new AbortController();
    controllerRef.current = controller;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const context = {
      signal: controller.signal,
      isCurrent,
      apply(view) {
        if (isCurrent()) onSession(view);
      },
      notify(message) {
        if (isCurrent()) setNotice(message);
      },
    };
    try {
      await task(context);
    } catch (failure) {
      if (!isCurrent()) return;
      if (failure instanceof ApiError && failure.code === 'game_not_found') onSession(null);
      setError(describeApiError(failure));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      busyRef.current = false;
      setBusy(false);
    }
  }

  function start() {
    if (session && !window.confirm('建立新遊戲？目前這局的後端進度不會保留在畫面上。')) return;
    run(async ({ signal, apply }) => apply(await createGame({ signal })), { invalidatePrevious: true });
  }

  function refresh() {
    const { id } = session;
    run(async ({ signal, apply }) => apply(await getGame(id, { signal })));
  }

  function act(type, choiceId) {
    const { id, revision } = session;
    const action = choiceId ? { type, choiceId, revision } : { type, revision };
    run(async ({ signal, isCurrent, apply, notify }) => {
      try {
        apply(await sendAction(id, action, { signal }));
      } catch (failure) {
        if (!(failure instanceof ApiError) || failure.code !== 'stale_revision') throw failure;
        if (!isCurrent()) return;
        // 版本過期：只重新讀取最新狀態，不自動重送剛才的動作
        apply(await getGame(id, { signal }));
        notify(describeApiError(failure));
      }
    });
  }

  const bar = <header className="game-bar">
    <button className="text-btn" onClick={onExit}><ArrowLeft size={17}/> 返回首頁</button>
    <span>後端測試模式</span>
    <div className="toolbar">
      {session && <>
        <button className="text-btn" onClick={refresh} disabled={busy}><RefreshCw size={16}/> 重新讀取</button>
        <button className="text-btn" onClick={start} disabled={busy}><Play size={16}/> 建立新遊戲</button>
      </>}
    </div>
  </header>;

  const status = <p className={`game-message${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>
    {error || notice || (busy ? '與後端通訊中…' : '後端測試模式：進度只保存在此頁面記憶體，重新整理或後端重啟後會遺失')}
  </p>;

  if (!session) {
    return <main className="game-layout">{bar}
      <section className="dialogue-panel">
        <div className="speaker">後端測試模式</div>
        <p>由 Express 遊戲 API 決定劇情節點、選項、AP 與換日。請先以劇情檔啟動後端，再建立新遊戲。</p>
        <div className="actions"><button className="primary" onClick={start} disabled={busy}><Play size={18}/> 建立新遊戲</button></div>
      </section>
      {status}
    </main>;
  }

  const { game, node, activeDepth, canFinishDepth } = session;
  // 換日按鈕只是提示，沿用後端已確定的條件；後端仍會再驗證
  const lastDay = game.day >= 21;
  const day15Pending = game.day === 15 && !game.flags.includes('day15_event_completed');
  const canAdvance = !busy && game.ap === 0 && !activeDepth && !lastDay && !day15Pending;
  const advanceHint = activeDepth ? null
    : lastDay ? '已到最後一天，無法再換日'
    : day15Pending ? '請先完成第 15 天強制事件'
    : game.ap > 0 ? 'AP 用完後才能換日'
    : null;

  return <main className="game-layout">{bar}
    <section className="backend-stats" aria-label="遊戲狀態">
      <div className="stat"><small>Day</small><strong data-testid="day">{game.day}</strong></div>
      <div className="stat"><small>AP</small><strong data-testid="ap">{game.ap}</strong></div>
      <div className="stat"><small>MBTI</small><strong>{game.mbtiLocked ? '已鎖定' : '未鎖定'}</strong></div>
      <div className="stat"><small>深度劇情</small><strong>{activeDepth ? `病患 ${activeDepth}` : '無'}</strong></div>
      <table className="patient-table">
        <thead><tr><th>病患</th><th>信任</th><th>治癒</th></tr></thead>
        <tbody>{PATIENTS.map(id => <tr key={id}>
          <td>{id}</td><td data-testid={`trust-${id}`}>{game.patients[id].trust}</td><td>{game.patients[id].healing}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="dialogue-panel">
      <div className="speaker">{activeDepth ? `深度劇情 · 病患 ${activeDepth}` : '劇情'}<small className="node-id">節點 {node.id}</small></div>
      <p>{node.text}</p>
      <div className="choices">
        {node.choices.map((choice, index) =>
          <button className="choice" key={`${node.id}-${choice.id}`} disabled={busy} onClick={() => act('choose', choice.id)}>
            <span>{index + 1}.</span>{choice.label}
          </button>)}
        {node.choices.length === 0 && !canFinishDepth && <p className="ending">目前沒有可用的選項。</p>}
      </div>
      <div className="actions">
        {canFinishDepth && <button className="primary" disabled={busy} onClick={() => act('finishDepth')}>
          <CheckCircle size={18}/> 完成深度劇情</button>}
        <button className="secondary" disabled={!canAdvance} onClick={() => act('advanceDay')}>
          <Moon size={18}/> 下一天</button>
        {advanceHint && <small className="hint">{advanceHint}</small>}
      </div>
    </section>
    {status}
  </main>;
}
