
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";
import { checkEventCondition } from "./EventConditions.js";

const state = createInitialGameState();

// 第 1 天符合日期條件
assert.equal(
  checkEventCondition(state, {
    type: "day",
    value: 1
  }),
  true
);

// 第 5 天條件尚未符合
assert.equal(
  checkEventCondition(state, {
    type: "day",
    value: 5
  }),
  false
);

// 尚未完成指定事件
assert.equal(
  checkEventCondition(state, {
    type: "flag",
    value: "test_event_completed"
  }),
  false
);

// 模擬完成事件
const completedState = {
  ...state,
  flags: ["test_event_completed"]
};

// 已符合事件條件
assert.equal(
  checkEventCondition(completedState, {
    type: "flag",
    value: "test_event_completed"
  }),
  true
);

// 原始狀態沒有被修改
assert.deepEqual(state.flags, []);



// 模擬病患 A 的數值
const patientState = {
  ...state,
  patients: {
    ...state.patients,
    A: {
      ...state.patients.A,
      trust: 60,
      healing: 35
    }
  }
};

// 信任值 60，要求至少 50，應該通過
assert.equal(
  checkEventCondition(patientState, {
    type: "patient",
    patientId: "A",
    field: "trust",
    minimum: 50
  }),
  true
);

// 信任值 60，要求至少 70，不應通過
assert.equal(
  checkEventCondition(patientState, {
    type: "patient",
    patientId: "A",
    field: "trust",
    minimum: 70
  }),
  false
);

// 治癒率 35，要求至少 30，應該通過
assert.equal(
  checkEventCondition(patientState, {
    type: "patient",
    patientId: "A",
    field: "healing",
    minimum: 30
  }),
  true
);

// 病患 B 不應受到病患 A 的影響
assert.equal(
  checkEventCondition(patientState, {
    type: "patient",
    patientId: "B",
    field: "trust",
    minimum: 50
  }),
  false
);

// 確認原始資料沒有改變
assert.equal(state.patients.A.trust, 0);


// 測試 AND：全部條件都必須符合
const andCondition = {
  type: "all" as const,
  conditions: [
    { type: "day" as const, value: 1 },
    {
      type: "patient" as const,
      patientId: "A" as const,
      field: "trust" as const,
      minimum: 50
    }
  ]
};

// 初始信任值為 0，應該無法解鎖
assert.equal(
  checkEventCondition(state, andCondition),
  false
);

// 使用前一步建立的 patientState
// 病患 A 信任值為 60
assert.equal(
  checkEventCondition(patientState, andCondition),
  true
);

// 測試 OR：符合其中一項就通過
const orCondition = {
  type: "any" as const,
  conditions: [
    { type: "day" as const, value: 5 },
    { type: "day" as const, value: 1 }
  ]
};

assert.equal(
  checkEventCondition(state, orCondition),
  true
);

// 空條件不允許解鎖
assert.equal(
  checkEventCondition(state, {
    type: "all",
    conditions: []
  }),
  false
);

assert.equal(
  checkEventCondition(state, {
    type: "any",
    conditions: []
  }),
  false
);


console.log("EventConditions 所有測試通過！");
