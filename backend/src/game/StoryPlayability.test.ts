import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadStory } from "./loadStory.js";
import { checkStoryPlayability } from "./StoryPlayability.js";
import { compileStory, type StoryChoice, type StoryNode } from "./StorySystem.js";

const choice = (id: string, action: NonNullable<StoryChoice["action"]>, next: string,
  condition?: StoryChoice["condition"]): StoryChoice => ({ id, label: id, action, next, condition });
const node = (id: string, ...choices: StoryChoice[]): StoryNode => ({ id, text: id, choices });
const play = choice("play", "interaction", "daily");
const crisis = choice("finish", "finishCrisis", "daily");
const warningsFor = (...nodes: StoryNode[]) =>
  checkStoryPlayability(compileStory({ start: "daily", nodes }));

test("21 天 fixture 可通過驗證，舊深度劇情範本保留且提示第 15 天限制", () => {
  const fixture = (name: string) => loadStory(fileURLToPath(new URL(`../../stories/${name}`, import.meta.url)));
  assert.deepEqual(checkStoryPlayability(fixture("day-1-21.fixture.json")), []);
  assert.deepEqual(checkStoryPlayability(fixture("depth.example.json")).map(({ code }) => code),
    ["crisis_blocked", "crisis_missing"]);
});

test("空節點、只含對話的循環及未連接的節點各有警告", () => {
  const warnings = warningsFor(
    node("daily", play, crisis, choice("visit", "dialogue", "loop"), choice("stop", "dialogue", "empty")),
    node("loop", choice("repeat", "dialogue", "loop")),
    node("empty"),
    node("orphan")
  );
  assert.deepEqual(warnings.map(({ code }) => code),
    ["unreachable_node", "ap_blocked", "ap_blocked", "crisis_blocked", "crisis_blocked"]);
  assert.match(warnings[0].message, /orphan/);
  assert.match(warnings[1].message, /第 1 天（AP 5）節點 loop/);
  assert.match(warnings[2].message, /節點 empty/);
});

test("互動需要不符的時段時，指出卡關當天及剩餘 AP", () => {
  const warnings = warningsFor(node("daily", choice("play", "interaction", "daily", {
    type: "slot", value: "morning"
  }), crisis));
  assert.deepEqual(warnings.map(({ code }) => code), ["ap_blocked", "crisis_missing"]);
  assert.match(warnings[0].message, /第 1 天（AP 4）/);
});

test("第 15 天可經由對話到達危機，完成後可依旗標繼續對話", () => {
  const completed = { type: "flag", value: "day15_event_completed" } as const;
  const warnings = warningsFor(
    node("daily", play, choice("enter", "dialogue", "crisis", { type: "day", value: 15 })),
    node("crisis", choice("finish", "finishCrisis", "crisis"), choice("resume", "dialogue", "daily", completed))
  );
  assert.deepEqual(warnings, []);
});

test("第 15 天通往危機的路徑必須符合日期、時段與完成旗標", () => {
  const conditions: StoryChoice["condition"][] = [
    { type: "day", value: 14 },
    { type: "slot", value: "morning" },
    { type: "flag", value: "day15_event_completed" }
  ];
  for (const condition of conditions) {
    const warnings = warningsFor(node("daily", play, choice("finish", "finishCrisis", "daily", condition)));
    assert.deepEqual(warnings.map(({ code }) => code), ["crisis_blocked", "crisis_missing"]);
  }
});

test("依賴病患或 MBTI 的危機路徑提示試玩，含確定可用分支時無須提示", () => {
  const conditions = [
    { type: "patient", patientId: "A", field: "trust", minimum: 50 },
    { type: "lockedPreference", value: "F" }
  ] as const;
  for (const condition of conditions) {
    assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition })).map(({ code }) => code),
      ["crisis_conditional"]);
    assert.deepEqual(warningsFor(node("daily", play, {
      ...crisis, condition: { type: "any", conditions: [condition, { type: "day", value: 15 }] }
    })), []);
  }
});

test("第 21 天空節點不推定為卡關或正式結局", () => {
  assert.deepEqual(warningsFor(
    node("daily", play, crisis, choice("last", "dialogue", "last", { type: "day", value: 21 })),
    node("last")
  ), []);
});
