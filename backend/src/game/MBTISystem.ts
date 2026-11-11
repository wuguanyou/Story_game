
import type {
  GameState,
  MBTIDimension
} from "./GameState.js";

// 定義可以變動的 MBTI 分數
type MBTIChanges = Partial<
  Record<MBTIDimension, number>
>;

// MBTI 八個性格傾向
const dimensions: MBTIDimension[] = [
  "E", "I", "S", "N",
  "T", "F", "J", "P"
];

// 根據選項更新 MBTI 分數
export function applyMBTIEffect(
  state: GameState,
  changes: MBTIChanges
): GameState {

  // 如果 MBTI 已鎖定，就不再累積分數
  if (state.mbtiLocked) {
    return state;
  }

  // 複製原本的 MBTI 資料
  const newScores = { ...state.mbti };

  // 逐一檢查八個性格傾向
  for (const dimension of dimensions) {
    const delta = changes[dimension] ?? 0;

    if (!Number.isFinite(delta) || delta < 0) {
      throw new Error("MBTI 分數變化必須是非負的有效數字");
    }

    // 累積分數
    newScores[dimension] += delta;
  }

  // 回傳更新後的遊戲狀態
  return {
    ...state,
    mbti: newScores
  };
}
