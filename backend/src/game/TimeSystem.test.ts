
import assert from "node:assert/strict";
import { createInitialGameState } from "./GameState.js";
import { spendAP, advanceDay } from "./TimeSystem.js";
import { completeDay15Event } from "./EventSystem.js";

// 建立新遊戲
const initialState = createInitialGameState();

// 消耗一次 AP
const nextState = spendAP(initialState);

assert.equal(nextState.ap, 4);

// 確認原始狀態沒有改變
assert.equal(initialState.ap, 5);

// 連續消耗 5 次 AP
let state = initialState;

for (let i = 0; i < 5; i++) {
  state = spendAP(state);
}

assert.equal(state.ap, 0);

// AP 用完後不能再行動
assert.throws(() => spendAP(state));

// 第 15 天不能自由行動
const eventState = {
  ...initialState,
  day: 15
};

assert.throws(() => spendAP(eventState));


// 測試第 1 天進入第 2 天
const day2 = advanceDay(initialState);

assert.equal(day2.day, 2);
assert.equal(day2.ap, 5);

// 原本的遊戲狀態不應被修改
assert.equal(initialState.day, 1);

// 測試第 14 天進入第 15 天
const day14 = {
  ...initialState,
  day: 14,
  ap: 1
};

const day15 = advanceDay(day14);

assert.equal(day15.day, 15);
assert.equal(day15.ap, 0);

// 測試第 15 天進入第 16 天
// 目前只測日期；尚未加入強制事件完成條件

// 進入第 15 天時，MBTI 必須鎖定
assert.equal(day15.mbtiLocked, true);

// 未完成強制事件，不能進入第 16 天
assert.throws(() => advanceDay(day15));


 // 使用 EventSystem 標記第 15 天事件完成
const completedDay15 = completeDay15Event(day15);


// 現在可以進入第 16 天
const day16 = advanceDay(completedDay15);

assert.equal(day16.day, 16);
assert.equal(day16.ap, 5);

// MBTI 仍保持鎖定
assert.equal(day16.mbtiLocked, true);

// 原本的 day15 不應被修改
assert.equal(day15.flags.length, 0);


// 第 21 天不允許繼續推進
const day21 = {
  ...initialState,
  day: 21
};

assert.throws(() => advanceDay(day21));

console.log("TimeSystem 所有測試通過！");
