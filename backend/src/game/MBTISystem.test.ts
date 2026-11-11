
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";
import { applyMBTIEffect } from "./MBTISystem.js";

// 建立新遊戲
const state = createInitialGameState();

// 測試增加 T 和 J 分數
const newState = applyMBTIEffect(state, {
  T: 2,
  J: 1
});

assert.equal(newState.mbti.T, 2);
assert.equal(newState.mbti.J, 1);

// 其他性格分數不應改變
assert.equal(newState.mbti.F, 0);
assert.equal(newState.mbti.E, 0);

// 原始資料不應被修改
assert.equal(state.mbti.T, 0);

// 再次累積 T 分數
const nextState = applyMBTIEffect(newState, {
  T: 3
});

assert.equal(nextState.mbti.T, 5);

// 測試 MBTI 鎖定
const lockedState = {
  ...nextState,
  mbtiLocked: true
};

const result = applyMBTIEffect(lockedState, {
  T: 10
});

assert.equal(result.mbti.T, 5);

// 測試無效分數
assert.throws(() => {
  applyMBTIEffect(state, { T: -1 });
});

console.log("MBTISystem 所有測試通過！");
