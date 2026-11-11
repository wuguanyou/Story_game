
import type { GameState } from "./GameState.js";

// 玩家執行一次自由行動
export function spendAP(state: GameState): GameState {

  // 第 15 天不能自由行動
  if (state.day === 15) {
    throw new Error("第 15 天是強制事件日");
  }

  // 檢查剩餘 AP
  if (state.ap <= 0) {
    throw new Error("今天的 AP 已經用完");
  }

  // 消耗 1 AP，回傳新狀態
  return {
    ...state,
    ap: state.ap - 1
  };
}




export function advanceDay(state: GameState): GameState {

  // 1. 遊戲最多只有 21 天
  if (state.day >= 21) {
    throw new Error("遊戲已經到達最後一天");
  }

  // 2. 第 15 天事件未完成，不能進入下一天
  if (
    state.day === 15 &&
    !state.flags.includes("day15_event_completed")
  ) {
    throw new Error("必須先完成第 15 天的強制事件");
  }

  // 3. 計算下一天
  const nextDay = state.day + 1;

  // 4. 第 15 天沒有自由探索 AP
  const nextAP = nextDay === 15 ? 0 : 5;

  // 5. 進入第 15 天時鎖定 MBTI
  return {
    ...state,
    day: nextDay,
    ap: nextAP,
    mbtiLocked:
      nextDay === 15 ? true : state.mbtiLocked
  };
}
