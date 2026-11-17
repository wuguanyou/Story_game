// 後端遊戲 API client：只包裝 docs/BACKEND_GAME_API.md 已定義的三個端點。
const BASE = '/api/games';

export class ApiError extends Error {
  /**
   * @param {string} code 後端回傳的 error 代碼，或前端自訂的 network_error / invalid_response
   * @param {number} status HTTP 狀態碼；連線失敗時為 0
   */
  constructor(code, status, message = code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new ApiError('network_error', 0);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    // Vite 代理在後端未啟動時會回傳非 JSON 的錯誤頁
    throw new ApiError('invalid_response', response.status);
  }
  if (!response.ok) {
    const code = data && typeof data.error === 'string' ? data.error : `http_${response.status}`;
    throw new ApiError(code, response.status);
  }
  return data;
}

// signal 只用來停止等待回應；伺服器若已完成操作，取消請求並不會撤銷該操作。
export function createGame({ signal } = {}) {
  return request('', { method: 'POST', signal });
}

export function getGame(id, { signal } = {}) {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

/**
 * @param {string} id
 * @param {{ type: 'choose' | 'advanceDay' | 'finishDepth', revision: number, choiceId?: string }} action
 * @param {{ signal?: AbortSignal }} [options]
 */
export function sendAction(id, action, { signal } = {}) {
  return request(`/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    body: JSON.stringify(action),
    signal,
  });
}

const MESSAGES = {
  network_error: '無法連線到後端 API，請確認後端已啟動。',
  invalid_response: '後端沒有回傳有效資料，請確認後端已啟動（開發模式由 Vite 代理至 127.0.0.1:3001）。',
  story_unconfigured: '後端尚未載入劇情。請設定 GAME_STORY_FILE 指向劇情 JSON，或設定 ENABLE_GAME_DEMO=1 後重新啟動後端。',
  session_limit: '後端進行中的遊戲已達上限，請重新啟動後端後再試。',
  game_not_found: '找不到這局遊戲，後端可能已重新啟動。請建立新遊戲。',
  stale_revision: '進度已在其他地方更新，已重新讀取最新狀態。剛才的操作沒有送出，請確認畫面後再操作。',
  choice_unavailable: '這個選項目前無法選擇。',
  day_unavailable: '目前無法換日：可能 AP 尚未用完、深度劇情尚未完成、第 15 天強制事件尚未完成，或已到最後一天。',
  depth_unavailable: '目前無法完成深度劇情，請先走到深度劇情的結尾。',
  invalid_action: '送出的操作格式不正確。',
  internal_error: '後端發生內部錯誤，請查看後端紀錄。',
};

export function describeApiError(error) {
  if (error instanceof ApiError) {
    const text = MESSAGES[error.code] ?? '後端回傳無法處理的錯誤。';
    return error.status ? `${text}（HTTP ${error.status} ${error.code}）` : text;
  }
  return '發生未預期的錯誤。';
}
