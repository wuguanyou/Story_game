
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";
import { applyPatientEffect } from "./PatientSystem.js";

// 建立初始遊戲狀態
const state = createInitialGameState();

// 更新病患 A
const newState = applyPatientEffect(state, "A", {
  healing: 20,
  trust: 15
});

// 測試數值是否正確
assert.equal(newState.patients.A.healing, 20);
assert.equal(newState.patients.A.trust, 15);

// 病患 B 不應受到影響
assert.equal(newState.patients.B.healing, 0);

// 原始資料不應被修改
assert.equal(state.patients.A.healing, 0);

// 測試數值上下限
const limitState = applyPatientEffect(newState, "A", {
  healing: 200,
  trust: -100
});

assert.equal(limitState.patients.A.healing, 100);
assert.equal(limitState.patients.A.trust, 0);

console.log("PatientSystem 所有測試通過！");
