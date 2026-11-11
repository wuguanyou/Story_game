
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";
import { applyChoiceEffects } from "./GameEngine.js";

// 1. 建立初始遊戲
const state = createInitialGameState();

// 2. 玩家選擇安慰病患 A
const newState = applyChoiceEffects(state, {
  patient: {
    id: "A",
    healing: 5,
    trust: 15
  },
  mbti: {
    F: 2
  }
});

// 3. 確認病患數值
assert.equal(newState.patients.A.healing, 5);
assert.equal(newState.patients.A.trust, 15);

// 4. 確認 MBTI 分數
assert.equal(newState.mbti.F, 2);

// 5. 確認其他病患沒有改變
assert.equal(newState.patients.B.trust, 0);

// 6. 確認原始狀態沒有被修改
assert.equal(state.patients.A.trust, 0);
assert.equal(state.mbti.F, 0);

// 7. 測試只有 MBTI 效果的選項
const nextState = applyChoiceEffects(newState, {
  mbti: {
    T: 3
  }
});

assert.equal(nextState.mbti.T, 3);
assert.equal(nextState.patients.A.trust, 15);

// 8. 測試 MBTI 鎖定後，病患仍可變化
const lockedState = {
  ...nextState,
  mbtiLocked: true
};

const finalState = applyChoiceEffects(lockedState, {
  patient: {
    id: "A",
    trust: 10
  },
  mbti: {
    F: 5
  }
});

assert.equal(finalState.patients.A.trust, 25);
assert.equal(finalState.mbti.F, 2);

console.log("GameEngine 所有測試通過！");
