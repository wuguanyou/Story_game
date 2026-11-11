
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";
import { advanceDay } from "./TimeSystem.js";
import { completeDay15Event } from "./EventSystem.js";

// 1. 建立初始遊戲
const initialState = createInitialGameState();

// 2. 第 1 天不能完成第 15 天事件
assert.throws(() => completeDay15Event(initialState));

// 3. 模擬第 14 天
const day14 = {
  ...initialState,
  day: 14
};

// 進入第 15 天
const day15 = advanceDay(day14);

assert.equal(day15.day, 15);
assert.equal(day15.mbtiLocked, true);

// 4. 完成事件
const completedState = completeDay15Event(day15);

assert.equal(
  completedState.flags.includes("day15_event_completed"),
  true
);

// 5. 原始狀態不能被修改
assert.equal(day15.flags.length, 0);

// 6. 重複呼叫不能新增重複紀錄
const repeatedState = completeDay15Event(completedState);

assert.equal(repeatedState.flags.length, 1);

// 7. 完成事件後可以進入第 16 天
const day16 = advanceDay(completedState);

assert.equal(day16.day, 16);
assert.equal(day16.ap, 5);

// 8. 未鎖定 MBTI 時不能完成事件
const unlockedState = {
  ...day15,
  mbtiLocked: false
};

assert.throws(() => completeDay15Event(unlockedState));

console.log("EventSystem 所有測試通過！");
