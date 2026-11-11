import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialGameState } from "./GameState.js";
import {
  advanceStoryDay, compileStory, selectStoryChoice,
  type StoryDefinition, type StoryProgress
} from "./StorySystem.js";

const definition: StoryDefinition = {
  start: "start",
  nodes: [{
    id: "start", text: "測試",
    choices: [{
      id: "act", label: "互動", next: "end", action: "interaction",
      condition: { type: "slot", value: "night" },
      effect: { patient: { id: "A", trust: 1 }, mbti: { F: 1 } }
    }]
  }, { id: "end", text: "完成", choices: [] }]
};

test("載入時拒絕缺少目標的選項及重複節點", () => {
  assert.throws(() => compileStory({ ...definition, nodes: definition.nodes.slice(0, 1) }), /目標節點/);
  assert.throws(() => compileStory({ ...definition, nodes: [...definition.nodes, definition.nodes[0]] }), /重複/);
});

test("危機選項依鎖定的傾向解鎖，完成後才能換日", () => {
  const story = compileStory({
    start: "crisis",
    nodes: [{ id: "crisis", text: "測試", choices: [{
      id: "finish", label: "完成危機", next: "end", action: "finishCrisis",
      condition: { type: "lockedPreference", value: "F" }
    }] }, { id: "end", text: "完成", choices: [] }]
  });
  const game = createInitialGameState();
  game.day = 14;
  const before: StoryProgress = { node: "crisis", game, pendingDepth: {} };
  assert.equal(selectStoryChoice(story, before, "finish"), undefined);
  assert.equal(selectStoryChoice(story, advanceStoryDay(before), "finish"), undefined);
  game.mbti.F = 1;
  const resolved = selectStoryChoice(story, advanceStoryDay(before), "finish");
  assert(resolved);
  assert.equal(resolved.game.ap, 0);
  assert.equal(advanceStoryDay(resolved).game.day, 16);
});

test("重新檢查時段，成功才扣 AP、套用效果並記錄隔天劇情", () => {
  const story = compileStory(definition);
  const game = createInitialGameState();
  game.day = 14;
  game.patients.A.trust = 49;
  const progress: StoryProgress = { node: "start", game, pendingDepth: {} };
  assert.equal(selectStoryChoice(story, progress, "act"), undefined);
  game.ap = 1;
  assert.deepEqual(selectStoryChoice(story, progress, "act")?.pendingDepth, {});
  game.patients.A.trust = 50;
  const updated = selectStoryChoice(story, progress, "act");
  assert(updated);
  assert.equal(updated.node, "end");
  assert.equal(updated.game.ap, 0);
  assert.equal(updated.game.patients.A.trust, 51);
  assert.equal(updated.game.mbti.F, 1);
  assert.deepEqual(updated.pendingDepth, { A: 15 });
  assert.equal(progress.game.ap, 1);
  assert.deepEqual(progress.game.history, []);
  const crisis = advanceStoryDay(updated);
  assert.equal(crisis.game.day, 15);
  assert.equal(crisis.game.mbtiLocked, true);
  assert.throws(() => advanceStoryDay(crisis), /強制事件/);
});
