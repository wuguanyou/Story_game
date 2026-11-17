import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App.jsx';
import BackendGame from './BackendGame.jsx';

// ---- 測試工具 ---------------------------------------------------------------

function gameView(id, text, overrides = {}) {
  const { game, ...rest } = overrides;
  return {
    id, revision: 0, pendingDepth: {}, activeDepth: null, canFinishDepth: false,
    node: { id: 'daily', text, choices: [{ id: 'practice', label: '測試互動' }] },
    game: {
      day: 1, ap: 5, mbtiLocked: false, flags: [], history: [],
      mbti: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      patients: { A: { trust: 0, healing: 0 }, B: { trust: 0, healing: 0 }, C: { trust: 0, healing: 0 } },
      ...game,
    },
    ...rest,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

/**
 * 可控制的 fetch：依序回應 replies 中的項目。
 * 刻意忽略 AbortSignal，模擬「伺服器已完成操作、回應仍然抵達」的最壞情況。
 */
function installFetch() {
  const calls = [];
  const replies = [];
  globalThis.fetch = vi.fn((url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body, signal: init.signal });
    const next = replies.shift();
    if (!next) throw new Error(`未預期的請求：${init.method ?? 'GET'} ${url}`);
    return typeof next === 'function' ? next() : Promise.resolve(next);
  });
  return {
    calls,
    reply: response => replies.push(response),
    hold() {
      const gate = deferred();
      replies.push(() => gate.promise);
      return gate;
    },
  };
}

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
const click = async name => { fireEvent.click(screen.getByRole('button', { name })); await flush(); };
const posts = calls => calls.filter(call => call.method === 'POST' && call.url.endsWith('/actions'));

let api;
beforeEach(() => {
  api = installFetch();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---- P1：跨畫面的非同步競態 ---------------------------------------------------

describe('後端測試模式：失效請求不得覆蓋目前進度', () => {
  it('建立遊戲請求延遲時離開再進入並建立新局，舊回應不會覆蓋新局', async () => {
    render(<App/>);
    await click('後端測試模式');
    const oldCreate = api.hold();
    await click('建立新遊戲');
    expect(screen.getByText('與後端通訊中…')).toBeTruthy();

    await click('返回首頁');
    expect(api.calls[0].signal.aborted).toBe(true);
    await click('後端測試模式');
    api.reply(json(201, gameView('new', '新局')));
    await click('建立新遊戲');
    expect(screen.getByText('新局')).toBeTruthy();

    await act(async () => oldCreate.resolve(json(201, gameView('old', '舊局'))));
    await flush();
    expect(screen.getByText('新局')).toBeTruthy();
    expect(screen.queryByText('舊局')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    // 新局仍可正常操作，且送出的是新局的 id
    api.reply(json(200, gameView('new', '新局行動後', { revision: 1, game: { ap: 4 } })));
    await click(/測試互動/);
    expect(api.calls.at(-1).url).toContain('/api/games/new/actions');
    expect(screen.getByText('新局行動後')).toBeTruthy();
  });

  it('建立遊戲請求失敗晚到時，不會在新畫面顯示舊錯誤', async () => {
    render(<App/>);
    await click('後端測試模式');
    const oldCreate = api.hold();
    await click('建立新遊戲');
    await click('返回首頁');
    await click('後端測試模式');
    api.reply(json(201, gameView('new', '新局')));
    await click('建立新遊戲');

    await act(async () => oldCreate.resolve(json(503, { error: 'story_unconfigured' })));
    await flush();
    expect(screen.getByText('新局')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('action 進行中離開再進入並建立新局，舊 action 回應不會覆蓋新局', async () => {
    render(<App/>);
    await click('後端測試模式');
    api.reply(json(201, gameView('old', '舊局')));
    await click('建立新遊戲');
    const oldAction = api.hold();
    await click(/測試互動/);

    await click('返回首頁');
    await click('後端測試模式');
    api.reply(json(201, gameView('new', '新局')));
    await click('建立新遊戲');
    expect(screen.getByText('新局')).toBeTruthy();

    await act(async () => oldAction.resolve(json(200, gameView('old', '舊局行動後', { revision: 1 }))));
    await flush();
    expect(screen.getByText('新局')).toBeTruthy();
    expect(screen.queryByText('舊局行動後')).toBeNull();
  });

  it('action 進行中離開再進入但不建立新局，舊 action 回應也不會套用', async () => {
    render(<App/>);
    await click('後端測試模式');
    api.reply(json(201, gameView('old', '舊局')));
    await click('建立新遊戲');
    const oldAction = api.hold();
    await click(/測試互動/);
    await click('返回首頁');
    await click('後端測試模式');

    await act(async () => oldAction.resolve(json(200, gameView('old', '舊局行動後', { revision: 1 }))));
    await flush();
    expect(screen.getByText('舊局')).toBeTruthy();
    expect(screen.queryByText('舊局行動後')).toBeNull();
    // 重新進入的畫面可以再操作（不被舊畫面的 busy 狀態卡住）
    expect(screen.getByRole('button', { name: /測試互動/ }).disabled).toBe(false);
  });

  it('409 stale_revision 的重新 GET 晚到時，同樣不會覆蓋新局且不重送動作', async () => {
    render(<App/>);
    await click('後端測試模式');
    api.reply(json(201, gameView('old', '舊局')));
    await click('建立新遊戲');
    api.reply(json(409, { error: 'stale_revision' }));
    const staleRefresh = api.hold();
    await click(/測試互動/);
    expect(api.calls.at(-1)).toMatchObject({ method: 'GET', url: '/api/games/old' });

    await click('返回首頁');
    await click('後端測試模式');
    api.reply(json(201, gameView('new', '新局')));
    await click('建立新遊戲');

    await act(async () => staleRefresh.resolve(json(200, gameView('old', '舊局重新讀取', { revision: 3 }))));
    await flush();
    expect(screen.getByText('新局')).toBeTruthy();
    expect(screen.queryByText('舊局重新讀取')).toBeNull();
    expect(screen.queryByText(/已重新讀取最新狀態/)).toBeNull();
    expect(posts(api.calls)).toHaveLength(1);
  });

  it('409 stale_revision 在同一畫面時重新讀取並提示，不自動重送', async () => {
    render(<App/>);
    await click('後端測試模式');
    api.reply(json(201, gameView('g', '目前')));
    await click('建立新遊戲');
    api.reply(json(409, { error: 'stale_revision' }));
    api.reply(json(200, gameView('g', '重新讀取後', { revision: 2, game: { ap: 3 } })));
    await click(/測試互動/);
    expect(screen.getByText('重新讀取後')).toBeTruthy();
    expect(screen.getByText(/已重新讀取最新狀態/)).toBeTruthy();
    expect(posts(api.calls)).toHaveLength(1);
  });

  it('同一畫面請求進行中連點，只送出一個請求', async () => {
    render(<App/>);
    await click('後端測試模式');
    api.reply(json(201, gameView('g', '目前')));
    await click('建立新遊戲');
    const pending = api.hold();
    const button = screen.getByRole('button', { name: /測試互動/ });
    act(() => { button.click(); button.click(); button.click(); });
    expect(posts(api.calls)).toHaveLength(1);
    await act(async () => pending.resolve(json(200, gameView('g', '行動後', { revision: 1 }))));
    await flush();
    expect(screen.getByText('行動後')).toBeTruthy();
  });
});

// ---- P2：第 15、21 天換日按鈕 -------------------------------------------------

describe('後端測試模式：下一天按鈕沿用後端已確定的換日條件', () => {
  function renderAt(overrides) {
    const session = gameView('g', '目前', { ...overrides, node: { id: 'daily', text: '目前', choices: [] } });
    render(<BackendGame session={session} onSession={() => {}} onExit={() => {}} requestGeneration={{ current: 0 }}/>);
    return screen.getByRole('button', { name: '下一天' });
  }

  it('第 15 天強制事件未完成：停用並提示', () => {
    const button = renderAt({ game: { day: 15, ap: 0, mbtiLocked: true } });
    expect(button.disabled).toBe(true);
    expect(screen.getByText('請先完成第 15 天強制事件')).toBeTruthy();
  });

  it('第 15 天強制事件已完成：可依 API 條件換日', async () => {
    const button = renderAt({ game: { day: 15, ap: 0, mbtiLocked: true, flags: ['day15_event_completed'] } });
    expect(button.disabled).toBe(false);
    expect(screen.queryByText('請先完成第 15 天強制事件')).toBeNull();
    api.reply(json(200, gameView('g', '第 16 天', { revision: 1, game: { day: 16 } })));
    fireEvent.click(button);
    await flush();
    expect(JSON.parse(api.calls[0].body)).toEqual({ type: 'advanceDay', revision: 0 });
  });

  it('第 21 天：停用並提示已到最後一天', () => {
    const button = renderAt({ game: { day: 21, ap: 0, mbtiLocked: true, flags: ['day15_event_completed'] } });
    expect(button.disabled).toBe(true);
    expect(screen.getByText('已到最後一天，無法再換日')).toBeTruthy();
  });

  it('其他日期維持 AP 與深度劇情限制', () => {
    expect(renderAt({ game: { day: 5, ap: 0 } }).disabled).toBe(false);
    cleanup();
    expect(renderAt({ game: { day: 5, ap: 3 } }).disabled).toBe(true);
    expect(screen.getByText('AP 用完後才能換日')).toBeTruthy();
    cleanup();
    expect(renderAt({ game: { day: 5, ap: 5 }, activeDepth: 'A' }).disabled).toBe(true);
  });
});
