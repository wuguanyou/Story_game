import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialGameState } from "./GameState.js";
import { checkStoryPlayability } from "./StoryPlayability.js";
import {
  advanceStoryDay, compileStory, finishDepth, selectStoryChoice, storyChoices,
  type StoryDefinition, type StoryProgress
} from "./StorySystem.js";

const dailyNode = (id: string) => ({
  id,
  text: id,
  choices: [{ id: "practice", label: "互動", next: id, action: "interaction" as const }]
});

const definition: StoryDefinition = {
  start: "daily",
  nodes: [
    dailyNode("daily"),
    dailyNode("day_02"),
    dailyNode("day_05"),
    {
      id: "day_15", text: "測試事件", choices: [
        { id: "finish", label: "完成", next: "day_15", action: "finishCrisis" },
        { id: "practice", label: "互動", next: "day_15", action: "interaction" }
      ]
    },
    dailyNode("day_16"),
    { id: "day_21", text: "第 21 天測試節點", choices: [] },
    { id: "depth", text: "深度劇情測試", choices: [] }
  ]
};

const dayStarts = { 2: "day_02", 5: "day_05", 15: "day_15", 16: "day_16", 21: "day_21" };
const story = compileStory({ ...definition, dayStarts, depthStarts: { A: "depth" } });

function atEndOfDay(day: number, node = definition.start): StoryProgress {
  const game = { ...createInitialGameState(), day, ap: 0 };
  return { node, game, pendingDepth: {} };
}

test("換日有對應入口時切換，未設定的日期和舊格式保留當前節點", () => {
  const day2 = advanceStoryDay(atEndOfDay(1), story);
  assert.equal(day2.node, "day_02");
  assert.equal(day2.game.day, 2);
  assert.equal(day2.game.ap, 5);
  assert.equal(advanceStoryDay(atEndOfDay(2, day2.node), story).node, "day_02");
  assert.equal(advanceStoryDay(atEndOfDay(20, "day_16"), story).node, "day_21");

  for (const input of [definition, { ...definition, dayStarts: {} }]) {
    const legacy = compileStory(input);
    assert.equal(advanceStoryDay(atEndOfDay(1, "day_05"), legacy).node, "day_05");
  }
});

test("同日觸發深度劇情時，完成後返回新一天的日常入口", () => {
  const progress = { ...atEndOfDay(4, "day_02"), pendingDepth: { A: 5 } };
  const entered = advanceStoryDay(progress, story);
  assert.equal(entered.game.day, 5);
  assert.equal(entered.node, "depth");
  assert.equal(entered.activeDepth?.resumeNode, "day_05");
  const finished = finishDepth(story, entered);
  assert(finished);
  assert.equal(finished.node, "day_05");
  assert.equal(finished.game.ap, 5);
  assert.equal(finished.activeDepth, undefined);
  assert.deepEqual(finished.pendingDepth, {});
});

test("第 15 天切換到危機入口，完成事件後第 16 天切換到日常入口", () => {
  const progress = { ...atEndOfDay(14, "day_05"), pendingDepth: { A: 15 } };
  const crisis = advanceStoryDay(progress, story);
  assert.equal(crisis.node, "day_15");
  assert.equal(crisis.game.day, 15);
  assert.equal(crisis.game.ap, 0);
  assert.equal(crisis.game.mbtiLocked, true);
  assert.equal(crisis.activeDepth, undefined);
  assert.deepEqual(crisis.pendingDepth, { A: 15 });
  assert.deepEqual(storyChoices(story, crisis).map(choice => choice.id), ["finish"]);
  assert.throws(() => advanceStoryDay(crisis, story), /強制事件/);

  const completed = selectStoryChoice(story, crisis, "finish");
  assert(completed);
  const day16 = advanceStoryDay(completed, story);
  assert.equal(day16.node, "day_16");
  assert.equal(day16.game.day, 16);
  assert.equal(day16.game.ap, 5);
  assert.equal(day16.game.mbtiLocked, true);
});

test("劇情編譯拒絕無效的每日入口格式與不存在的節點", () => {
  for (const invalid of [null, [], { 1: "daily" }, { 22: "daily" }, { "02": "daily" },
    { "2.5": "daily" }, { "2 ": "daily" }, { 2: " " }, { 2: 3 }]) {
    assert.throws(() => compileStory({ ...definition, dayStarts: invalid }), /每日劇情入口資料無效/);
  }
  assert.throws(() => compileStory({ ...definition, dayStarts: { 15: "missing" } }),
    /找不到第 15 天的劇情入口節點：missing/);
});

test("可玩性檢查以配置的每日入口為換日目標，且無法跳過前一日的 AP 限制", () => {
  assert.deepEqual(checkStoryPlayability(story), []);

  const blocked = compileStory({
    ...definition,
    dayStarts,
    depthStarts: { A: "depth" },
    nodes: definition.nodes.map(node => node.id === "day_02" ? { ...node, choices: [] } : node)
  });
  const warnings = checkStoryPlayability(blocked);
  assert.deepEqual(warnings.map(warning => warning.code), ["ap_blocked", "crisis_missing"]);
  assert.match(warnings[0].message, /第 2 天（AP 5）節點 day_02/);
});
