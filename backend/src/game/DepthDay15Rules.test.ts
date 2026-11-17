import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialGameState, type PatientId } from "./GameState.js";
import { spendAP } from "./TimeSystem.js";
import {
  advanceStoryDay, compileStory, finishDepth, selectStoryChoice, storyChoices,
  type StoryProgress
} from "./StorySystem.js";

const story = compileStory({
  start: "daily",
  depthStarts: { A: "depth_a" },
  nodes: [{
    id: "daily", text: "每日",
    choices: [
      { id: "trustA", label: "A 信任 +1", next: "daily", action: "interaction",
        effect: { patient: { id: "A", trust: 1 } } },
      { id: "healA", label: "A 治癒 +1", next: "daily", action: "interaction",
        effect: { patient: { id: "A", healing: 1 } } },
      { id: "hurtA", label: "A 信任 -1", next: "daily", action: "interaction",
        effect: { patient: { id: "A", trust: -1 } } },
      { id: "jumpA", label: "A 信任 +60", next: "daily", action: "interaction",
        effect: { patient: { id: "A", trust: 60 } } },
      { id: "trustB", label: "B 信任 +1", next: "daily", action: "interaction",
        effect: { patient: { id: "B", trust: 1 } } },
      { id: "talk", label: "對話", next: "daily", action: "dialogue", effect: { mbti: { F: 1 } } },
      { id: "crisis", label: "完成危機", next: "daily", action: "finishCrisis" }
    ]
  }, {
    id: "depth_a", text: "A 深度",
    choices: [{ id: "continue", label: "繼續", next: "depth_a_end", action: "dialogue",
      effect: { patient: { id: "A", trust: 5 } } }]
  }, { id: "depth_a_end", text: "結束", choices: [] }]
});

function progressAt(
  day: number,
  options: { ap?: number; trustA?: number; healA?: number; trustB?: number;
    pendingDepth?: StoryProgress["pendingDepth"]; completedDepth?: PatientId[] } = {}
): StoryProgress {
  const game = createInitialGameState();
  game.day = day;
  game.ap = options.ap ?? 5;
  game.mbtiLocked = day >= 15;
  game.patients.A.trust = options.trustA ?? 0;
  game.patients.A.healing = options.healA ?? 0;
  game.patients.B.trust = options.trustB ?? 0;
  return {
    node: "daily", game, pendingDepth: options.pendingDepth ?? {},
    completedDepth: options.completedDepth
  };
}

function choose(progress: StoryProgress, choiceId: string): StoryProgress {
  const next = selectStoryChoice(story, progress, choiceId);
  assert(next, `選項 ${choiceId} 應可選擇`);
  return next;
}

test("只有第 4～14 天跨越 50 才記錄隔天的深度劇情", () => {
  assert.deepEqual(choose(progressAt(3, { trustA: 50 }), "trustA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(4, { trustA: 50 }), "trustA").pendingDepth, { A: 5 });
  assert.deepEqual(choose(progressAt(9, { trustA: 50 }), "trustA").pendingDepth, { A: 10 });
  assert.deepEqual(choose(progressAt(14, { trustA: 50 }), "trustA").pendingDepth, { A: 15 });
  assert.deepEqual(choose(progressAt(16, { trustA: 50 }), "trustA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(21, { trustA: 50 }), "trustA").pendingDepth, {});
});

test("門檻以「由 <=50 變為 >50」判斷，信任值與治癒值皆適用", () => {
  assert.deepEqual(choose(progressAt(4, { trustA: 49 }), "trustA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(4, { trustA: 50 }), "trustA").pendingDepth, { A: 5 });
  assert.deepEqual(choose(progressAt(4, { trustA: 51 }), "trustA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(4, { trustA: 51 }), "hurtA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(4, { trustA: 0 }), "jumpA").pendingDepth, { A: 5 });
  assert.deepEqual(choose(progressAt(4, { healA: 50 }), "healA").pendingDepth, { A: 5 });
  assert.deepEqual(choose(progressAt(4, { healA: 49 }), "healA").pendingDepth, {});
  assert.deepEqual(choose(progressAt(4, { trustB: 50 }), "trustB").pendingDepth, { B: 5 });
});

test("已完成深度劇情的病患再次跨越 50 不會重新記錄", () => {
  const progress = progressAt(6, { trustA: 50, completedDepth: ["A"] });
  assert.deepEqual(choose(progress, "trustA").pendingDepth, {});
});

test("只有隔天恰有一位到期且有入口的病患才進入深度劇情", () => {
  const day4 = progressAt(4, { ap: 0, pendingDepth: { A: 5 } });
  const entered = advanceStoryDay(day4, story);
  assert.equal(entered.node, "depth_a");
  assert.deepEqual(entered.activeDepth, { patient: "A", resumeNode: "daily" });

  const both = advanceStoryDay(progressAt(4, { ap: 0, pendingDepth: { A: 5, B: 5 } }), story);
  assert.equal(both.node, "daily");
  assert.equal(both.activeDepth, undefined);
  assert.deepEqual(both.pendingDepth, { A: 5, B: 5 });

  const noEntry = advanceStoryDay(progressAt(4, { ap: 0, pendingDepth: { B: 5 } }), story);
  assert.equal(noEntry.node, "daily");
  assert.equal(noEntry.activeDepth, undefined);
  assert.deepEqual(noEntry.pendingDepth, { B: 5 });

  const notDue = advanceStoryDay(progressAt(4, { ap: 0, pendingDepth: { A: 6 } }), story);
  assert.equal(notDue.node, "daily");
  assert.equal(notDue.activeDepth, undefined);

  const otherLater = advanceStoryDay(progressAt(4, { ap: 0, pendingDepth: { A: 5, B: 6 } }), story);
  assert.equal(otherLater.activeDepth?.patient, "A");
});

test("深度劇情只顯示對話選項、不消耗 AP，完成後回原節點且不重複", () => {
  const entered = advanceStoryDay(progressAt(4, { ap: 0, trustA: 51, pendingDepth: { A: 5 } }), story);
  assert.deepEqual(storyChoices(story, entered).map(choice => choice.id), ["continue"]);
  assert.equal(selectStoryChoice(story, entered, "trustA"), undefined);
  assert.throws(() => advanceStoryDay(entered, story), /深度劇情/);

  const atEnd = choose(entered, "continue");
  assert.equal(atEnd.game.ap, 5);
  assert.equal(atEnd.game.patients.A.trust, 56);
  assert.deepEqual(storyChoices(story, atEnd), []);

  const finished = finishDepth(story, atEnd);
  assert(finished);
  assert.equal(finished.node, "daily");
  assert.equal(finished.activeDepth, undefined);
  assert.equal(finished.game.ap, 5);
  assert.deepEqual(finished.completedDepth, ["A"]);
  assert.deepEqual(finished.pendingDepth, {});
  assert.equal(finishDepth(story, finished), undefined);

  // 數值回落後再次跨越 50：已完成者不再寫入 pendingDepth，換日也不會重播
  const dropped = { ...finished, game: { ...finished.game, ap: 1,
    patients: { ...finished.game.patients, A: { healing: 0, trust: 50 } } } };
  const recrossed = choose(dropped, "trustA");
  assert.deepEqual(recrossed.pendingDepth, {});
  assert.equal(advanceStoryDay(recrossed, story).activeDepth, undefined);
});

test("尚未到達結尾節點時不能完成深度劇情，沒有進行中的深度劇情也不能完成", () => {
  const entered = advanceStoryDay(progressAt(4, { ap: 0, pendingDepth: { A: 5 } }), story);
  assert.equal(finishDepth(story, entered), undefined);
  assert.equal(finishDepth(story, progressAt(5)), undefined);
  assert.equal(finishDepth(story, { ...progressAt(5), node: "depth_a_end" }), undefined);
});

test("第 15 天鎖定 MBTI、AP 為 0，且不能自由行動", () => {
  const day15 = advanceStoryDay(progressAt(14, { ap: 0 }), story);
  assert.equal(day15.game.day, 15);
  assert.equal(day15.game.ap, 0);
  assert.equal(day15.game.mbtiLocked, true);
  assert.throws(() => spendAP(day15.game), /第 15 天/);
  assert.throws(() => spendAP({ ...day15.game, ap: 3 }), /第 15 天/);

  const ids = storyChoices(story, day15).map(choice => choice.id);
  assert.deepEqual(ids, ["talk", "crisis"]);
  for (const id of ["trustA", "healA", "hurtA", "jumpA", "trustB"]) {
    assert.equal(selectStoryChoice(story, day15, id), undefined);
    assert.equal(selectStoryChoice(story, { ...day15, game: { ...day15.game, ap: 5 } }, id), undefined);
  }

  const talked = choose(day15, "talk");
  assert.deepEqual(talked.game.mbti, day15.game.mbti);
  assert.equal(talked.game.ap, 0);
});

test("第 15 天強制事件完成前不能進入第 16 天，且事件只能在第 15 天完成一次", () => {
  assert.equal(selectStoryChoice(story, progressAt(14), "crisis"), undefined);
  const day15 = advanceStoryDay(progressAt(14, { ap: 0 }), story);
  assert.throws(() => advanceStoryDay(day15, story), /強制事件/);

  const resolved = choose(day15, "crisis");
  assert(resolved.game.flags.includes("day15_event_completed"));
  assert.equal(selectStoryChoice(story, resolved, "crisis"), undefined);

  const day16 = advanceStoryDay(resolved, story);
  assert.equal(day16.game.day, 16);
  assert.equal(day16.game.ap, 5);
  assert.equal(day16.game.mbtiLocked, true);
  assert.equal(selectStoryChoice(story, day16, "crisis"), undefined);
});
