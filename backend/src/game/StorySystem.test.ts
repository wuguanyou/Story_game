
import assert from "node:assert/strict";

import { createInitialGameState } from "./GameState.js";

import {
  getAvailableChoices,
  type StoryNode
} from "./StorySystem.js";

// 建立新遊戲
const state = createInitialGameState();

// 建立一段測試劇情
const node: StoryNode = {
  id: "patient_a_start",
  text: "我不知道該不該相信你……",
  choices: [
    {
      id: "listen",
      label: "我願意聽你說。",
      next: "patient_a_listen"
    },
    {
      id: "secret",
      label: "還記得上次的秘密嗎？",
      next: "patient_a_secret",
      condition: {
        type: "patient",
        patientId: "A",
        field: "trust",
        minimum: 50
      }
    }
  ]
};

// 測試 1：初始信任值是 0
const initialChoices = getAvailableChoices(state, node);

assert.equal(initialChoices.length, 1);
assert.equal(initialChoices[0]?.id, "listen");

// 模擬病患 A 信任值增加到 60
const trustedState = {
  ...state,
  patients: {
    ...state.patients,
    A: {
      ...state.patients.A,
      trust: 60
    }
  }
};

// 測試 2：兩個選項都應該出現
const unlockedChoices = getAvailableChoices(
  trustedState,
  node
);

assert.equal(unlockedChoices.length, 2);

assert.deepEqual(
  unlockedChoices.map(choice => choice.id),
  ["listen", "secret"]
);

// 原始資料不應被修改
assert.equal(state.patients.A.trust, 0);
assert.equal(node.choices.length, 2);

console.log("StorySystem 所有測試通過！");
