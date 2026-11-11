
import type { GameState } from "./GameState.js";

const DAY15_EVENT = "day15_event_completed";

// 記錄第 15 天強制事件完成
export function completeDay15Event(
  state: GameState
): GameState {

  // 1. 只能在第 15 天完成
  if (state.day !== 15) {
    throw new Error("目前不是第 15 天");
  }

  // 2. MBTI 必須已鎖定
  if (!state.mbtiLocked) {
    throw new Error("MBTI 尚未鎖定");
  }

  // 3. 避免重複完成事件
  if (state.flags.includes(DAY15_EVENT)) {
    return state;
  }

  // 4. 新增完成標記
  return {
    ...state,
    flags: [...state.flags, DAY15_EVENT]
  };
}
