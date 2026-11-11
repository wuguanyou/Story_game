
import assert from "node:assert/strict";
import { createInitialGameState } from "./GameState.js";

// 1. 建立新遊戲
const state = createInitialGameState();

// 2. 檢查日期與行動點數
assert.equal(state.day, 1);
assert.equal(state.ap, 5);

// 3. 檢查三位病患的初始資料
assert.equal(state.patients.A.healing, 0);
assert.equal(state.patients.A.trust, 0);
assert.equal(state.patients.B.healing, 0);
assert.equal(state.patients.C.trust, 0);

// 4. 檢查 MBTI
assert.equal(state.mbti.E, 0);
assert.equal(state.mbti.I, 0);
assert.equal(state.mbtiLocked, false);

// 5. 確認每次建立的遊戲彼此獨立
const anotherState = createInitialGameState();

state.patients.A.trust = 50;

assert.equal(anotherState.patients.A.trust, 0);

console.log("GameState 所有測試通過！");
