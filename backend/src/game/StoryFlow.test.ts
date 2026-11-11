import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialGameState } from "./GameState.js";
import {
  advanceStoryDay, compileStory, finishDepth, selectStoryChoice,
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

test("唯一到期的深度劇情在隔天早晨開始，結束後回到原節點", () => {
  const story = compileStory({
    ...definition, depthStarts: { A: "depth" },
    nodes: [...definition.nodes, {
      id: "depth", text: "深度劇情", choices: [{
        id: "continue", label: "繼續", action: "dialogue", next: "depthEnd"
      }]
    }, { id: "depthEnd", text: "完成", choices: [] }]
  });
  const game = createInitialGameState();
  game.day = 4;
  game.ap = 1;
  game.patients.A.trust = 50;
  const selected = selectStoryChoice(story, { node: "start", game, pendingDepth: {} }, "act");
  assert(selected);
  const morning = advanceStoryDay(selected, story);
  assert.equal(morning.game.day, 5);
  assert.equal(morning.game.ap, 5);
  assert.equal(morning.node, "depth");
  assert.equal(finishDepth(story, morning), undefined);
  assert.throws(() => advanceStoryDay(morning, story), /深度劇情/);
  const terminal = selectStoryChoice(story, morning, "continue");
  assert(terminal);
  const finished = finishDepth(story, terminal);
  assert(finished);
  assert.equal(finished.node, "end");
  assert.equal(finished.game.ap, 5);
  assert.deepEqual(finished.pendingDepth, {});
  assert.equal(finishDepth(story, finished), undefined);
  const recross = selectStoryChoice(story, {
    ...finished, node: "start", game: { ...finished.game, ap: 1, patients: game.patients }
  }, "act");
  assert(recross);
  assert.deepEqual(recross.pendingDepth, {});
  assert.equal(advanceStoryDay(recross, story).node, "end");
  assert.equal(advanceStoryDay({ ...selected, pendingDepth: { A: 5, B: 5 } }, story).node, "end");
  assert.equal(advanceStoryDay({ ...selected, game: { ...selected.game, day: 14 },
    pendingDepth: { A: 15 } }, story).node, "end");
});

test("載入外部劇情時指出條件與效果所在的選項", () => {
  const storyWith = (field: object) => ({ ...definition, nodes: [{
    ...definition.nodes[0], choices: [{ ...definition.nodes[0].choices[0], ...field }]
  }, definition.nodes[1]] });
  assert.throws(() => compileStory(storyWith({ condition: { type: "all", conditions: [
    { type: "patient", patientId: "D", field: "trust", minimum: 50 }
  ] } })), /選項條件無效：start\/act/);
  assert.throws(() => compileStory(storyWith({ effect: { mbti: { F: -1 } } })), /選項效果無效：start\/act/);
  assert.throws(() => compileStory({ ...definition, depthStarts: { A: "missing" } }), /深度劇情節點/);
});

test("有其他正常結尾時也拒絕會卡在循環的深度劇情分支", () => {
  const dialogue = (next: string) => ({ id: next, label: next, action: "dialogue", next });
  assert.throws(() => compileStory({
    ...definition,
    depthStarts: { A: "depth" },
    nodes: [...definition.nodes,
      { id: "depth", text: "測試", choices: [dialogue("end"), dialogue("loop")] },
      { id: "loop", text: "測試", choices: [dialogue("loop")] }]
  }), /無法抵達結尾：loop/);
});

test("深度劇情至少要有一條不依賴解鎖條件的結尾路徑", () => {
  const depth = { id: "depth", text: "測試", choices: [{
    id: "locked", label: "限定選項", action: "dialogue", next: "end",
    condition: { type: "flag", value: "example" }
  }] };
  const data = { ...definition, depthStarts: { A: "depth" } };
  assert.throws(() => compileStory({ ...data, nodes: [...definition.nodes, depth] }), /缺少不受條件限制/);
  assert.doesNotThrow(() => compileStory({ ...data, nodes: [...definition.nodes, {
    ...depth, choices: [...depth.choices, { id: "continue", label: "繼續", action: "dialogue", next: "end" }]
  }] }));
});

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
