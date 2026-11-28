import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const playWithTrust: StoryChoice = { ...play, effect: { patient: { id: "A", trust: 10 } } };
  const conditions = [
    { type: "patient", patientId: "A", field: "trust", minimum: 50 },
    { type: "lockedPreference", value: "F" }
  ] as const;
  for (const condition of conditions) {
    assert.deepEqual(warningsFor(node("daily", playWithTrust, { ...crisis, condition })).map(({ code }) => code),
      ["crisis_conditional"]);
    assert.deepEqual(warningsFor(node("daily", playWithTrust, {
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

test("病患門檻在巢狀 all/any 內依 0～100 判斷，100 仍需試玩", () => {
  const playWithTrust: StoryChoice = { ...play, effect: { patient: { id: "A", trust: 10 } } };
  const patient = (minimum: number) => ({ type: "patient", patientId: "A", field: "trust", minimum } as const);
  for (const [minimum, expected] of [
    [-1, []], [0, []], [100, ["crisis_conditional"]], [100.01, ["crisis_blocked", "crisis_missing"]]
  ] as const) {
    const condition = {
      type: "all",
      conditions: [
        { type: "day", value: 15 },
        { type: "any", conditions: [patient(minimum), { type: "slot", value: "morning" }] }
      ]
    } satisfies NonNullable<StoryChoice["condition"]>;
    assert.deepEqual(warningsFor(node("daily", playWithTrust, { ...crisis, condition })).map(warning => warning.code),
      expected);
  }
});

test("危機路徑可能在第 15 天以前就依賴病患條件", () => {
  const condition = { type: "patient", patientId: "A", field: "healing", minimum: 1 } as const;
  const boostHealing: StoryChoice = {
    id: "heal", label: "heal", action: "dialogue", next: "daily",
    effect: { patient: { id: "A", healing: 1 } }
  };
  const warnings = warningsFor(node("daily", boostHealing, { ...play, condition }, crisis));
  assert.deepEqual(warnings.map(warning => warning.code), ["ap_conditional", "crisis_conditional"]);
  assert.match(warnings[0].message, /第 1 天（AP 5）節點 daily/);
  assert.match(warnings[1].message, /從第 1 天到完成第 15 天/);
});

test("第 16～20 天掃描每日入口，同節點的多個日期與 AP 組合只列一則警告", () => {
  const story = compileStory({
    start: "daily",
    dayStarts: { 16: "late" },
    nodes: [
      node("daily", play, crisis),
      node("late", choice("play", "interaction", "late"), choice("visit", "dialogue", "blocked")),
      node("blocked")
    ]
  });
  const warnings = checkStoryPlayability(story);
  assert.deepEqual(warnings.map(warning => warning.code), ["ap_blocked"]);
  assert.match(warnings[0].message, /第 16 天（AP 5）節點 blocked/);
  assert.match(warnings[0].message, /另有 24 個日期／AP 組合/);
});

test("深度劇情入口與其結尾都是結構上的入口可達節點", () => {
  const story = compileStory({
    start: "daily",
    depthStarts: { A: "depth" },
    nodes: [node("daily", play, crisis), node("depth", choice("next", "dialogue", "end")),
      node("end"), node("orphan")]
  });
  const warnings = checkStoryPlayability(story);
  assert.deepEqual(warnings.map(warning => warning.code), ["unreachable_node"]);
  assert.match(warnings[0].message, /節點 orphan/);
});

test("CLI 無警告及有警告都退出 0，無效節點參照退出 1", () => {
  const cli = fileURLToPath(new URL("../validate-story.ts", import.meta.url));
  const fixture = (name: string) => fileURLToPath(new URL(`../../stories/${name}`, import.meta.url));
  const run = (file: string) => {
    const result = spawnSync(process.execPath, ["--import", "tsx", cli, file], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      timeout: 30_000
    });
    assert.ifError(result.error);
    return result;
  };
  const valid = run(fixture("day-1-21.fixture.json"));
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /劇情驗證通過/);
  assert.doesNotMatch(valid.stderr, /^警告 \[/m);

  const warned = run(fixture("depth.example.json"));
  assert.equal(warned.status, 0, warned.stderr);
  assert.match(warned.stdout, /劇情驗證通過/);
  assert.match(warned.stderr, /警告 \[crisis_missing\]/);

  const folder = mkdtempSync(join(tmpdir(), "story-validation-"));
  try {
    const invalid = join(folder, "invalid.json");
    writeFileSync(invalid, JSON.stringify({
      start: "daily", dayStarts: { 2: "missing" }, nodes: [node("daily", play, crisis)]
    }));
    const rejected = run(invalid);
    assert.equal(rejected.status, 1, rejected.stderr);
    assert.match(rejected.stderr, /找不到第 2 天的劇情入口節點：missing/);
    assert.doesNotMatch(rejected.stdout, /劇情驗證通過/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("第 16～20 天僅剩動態條件互動時回報 ap_conditional，有合法無條件替代路徑時不警告", () => {
  const conditionalDay16 = compileStory({
    start: "daily",
    dayStarts: { 16: "day_16" },
    nodes: [
      node("daily", play, crisis),
      node("day_16", choice("only_f", "interaction", "day_16", { type: "lockedPreference", value: "F" }))
    ]
  });
  const warnings = checkStoryPlayability(conditionalDay16);
  assert.deepEqual(warnings.map(({ code }) => code), ["ap_conditional"]);
  assert.match(warnings[0].message, /第 16 天（AP 5）節點 day_16/);
  assert.match(warnings[0].message, /另有 24 個日期／AP 組合/);

  const withFallback = compileStory({
    start: "daily",
    dayStarts: { 16: "day_16" },
    nodes: [
      node("daily", play, crisis),
      node("day_16",
        choice("only_f", "interaction", "day_16", { type: "lockedPreference", value: "F" }),
        choice("fallback", "interaction", "day_16"))
    ]
  });
  assert.deepEqual(checkStoryPlayability(withFallback), []);
});

test("非主線分支僅剩動態條件互動或危機時回報條件警告，有返回主線路徑時不警告", () => {
  const boostTrust: StoryChoice = {
    id: "boost", label: "boost", action: "dialogue", next: "daily",
    effect: { patient: { id: "A", trust: 10 } }
  };
  const trapStory = warningsFor(
    node("daily", play, crisis, boostTrust, choice("enter_trap", "dialogue", "trap")),
    node("trap",
      choice("need_trust", "interaction", "daily", { type: "patient", patientId: "A", field: "trust", minimum: 90 }),
      choice("need_f", "finishCrisis", "daily", { type: "lockedPreference", value: "F" }))
  );
  assert.deepEqual(trapStory.map(({ code }) => code), ["ap_conditional", "crisis_conditional"]);
  assert.match(trapStory[0].message, /節點 trap/);
  assert.match(trapStory[1].message, /第 15 天（AP 0）節點 trap/);

  const withReturn = warningsFor(
    node("daily", play, crisis, boostTrust, choice("enter_trap", "dialogue", "trap")),
    node("trap",
      choice("need_trust", "interaction", "daily", { type: "patient", patientId: "A", field: "trust", minimum: 90 }),
      choice("back", "dialogue", "daily"))
  );
  assert.deepEqual(withReturn, []);
});

test("互斥 MBTI 條件在巢狀 all/any 內判定為不可達，並保留合法替代分支", () => {
  const mutex = {
    type: "all" as const,
    conditions: [
      { type: "lockedPreference" as const, value: "E" as const },
      { type: "lockedPreference" as const, value: "I" as const }
    ]
  };
  assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition: mutex })).map(({ code }) => code),
    ["crisis_blocked", "crisis_missing"]);

  const nestedValid = {
    type: "all" as const,
    conditions: [
      { type: "lockedPreference" as const, value: "E" as const },
      {
        type: "any" as const,
        conditions: [
          { type: "lockedPreference" as const, value: "I" as const },
          { type: "lockedPreference" as const, value: "F" as const }
        ]
      }
    ]
  };
  assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition: nestedValid })).map(({ code }) => code),
    ["crisis_conditional"]);

  const crossAxisValid = {
    type: "all" as const,
    conditions: [
      {
        type: "any" as const,
        conditions: [
          { type: "lockedPreference" as const, value: "E" as const },
          { type: "lockedPreference" as const, value: "S" as const }
        ]
      },
      {
        type: "any" as const,
        conditions: [
          { type: "lockedPreference" as const, value: "I" as const },
          { type: "lockedPreference" as const, value: "N" as const }
        ]
      }
    ]
  };
  assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition: crossAxisValid })).map(({ code }) => code),
    ["crisis_conditional"]);

  const withUnconditionalAlternative = {
    type: "any" as const,
    conditions: [mutex, { type: "day" as const, value: 15 }]
  };
  assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition: withUnconditionalAlternative })), []);
});

test("病患數值可達性依劇情正向效果判斷，且不假設第 1 天 AP 5 在有 dialogue 效果時必為 0", () => {
  const trust50 = { type: "patient" as const, patientId: "A" as const, field: "trust" as const, minimum: 50 };

  // 全劇情無任何增加 A.trust 的效果：門檻 50 確定不可達
  assert.deepEqual(warningsFor(node("daily", play, { ...crisis, condition: trust50 })).map(({ code }) => code),
    ["crisis_blocked", "crisis_missing"]);

  // 無正向效果時，不應因不可能進入的分支而誤報 ap_blocked
  assert.deepEqual(warningsFor(
    node("daily", play, crisis, choice("enter", "dialogue", "day5_room", trust50)),
    node("day5_room", choice("act5", "interaction", "daily", { type: "day", value: 5 }))
  ), []);

  // dialogue 可在第 1 天 AP 5 增加病患數值：進入 day5_room 必須在第 1 天 AP 5 就回報 ap_blocked
  const dialogueBoost: StoryChoice = {
    id: "talk_boost", label: "talk_boost", action: "dialogue", next: "daily",
    effect: { patient: { id: "A", trust: 10 } }
  };
  const withDialogueBoost = warningsFor(
    node("daily", play, crisis, dialogueBoost, choice("enter", "dialogue", "day5_room", trust50)),
    node("day5_room", choice("act5", "interaction", "daily", { type: "day", value: 5 }))
  );
  assert.equal(withDialogueBoost[0]?.code, "ap_blocked");
  assert.match(withDialogueBoost[0]?.message ?? "", /第 1 天（AP 5）節點 day5_room/);

  // 僅 interaction 有正向效果時：第 1 天 AP 5 尚未互動不可進入，AP 4 起才可進入
  const interactionBoost: StoryChoice = {
    ...play,
    effect: { patient: { id: "A", trust: 10 } }
  };
  const withInteractionBoost = warningsFor(
    node("daily", interactionBoost, crisis, choice("enter", "dialogue", "day5_room", trust50)),
    node("day5_room", choice("act5", "interaction", "daily", { type: "day", value: 5 }))
  );
  assert.equal(withInteractionBoost[0]?.code, "ap_blocked");
  assert.match(withInteractionBoost[0]?.message ?? "", /第 1 天（AP 4）節點 day5_room/);
});

test("前置天數卡關時仍獨立檢查後續 dayStarts，並區分獨立入口檢查與從第 1 天可達", () => {
  const missingCrisisWithBrokenDay16 = compileStory({
    start: "daily",
    dayStarts: { 16: "broken_16" },
    nodes: [
      node("daily", play),
      node("broken_16")
    ]
  });
  const warnings1 = checkStoryPlayability(missingCrisisWithBrokenDay16);
  assert.deepEqual(warnings1.map(({ code }) => code), ["crisis_blocked", "ap_blocked", "crisis_missing"]);
  assert.match(warnings1[1].message, /第 16 天（AP 5）節點 broken_16/);
  assert.match(warnings1[1].message, /獨立檢查 dayStarts 入口/);

  const blockedDay2WithHealthyDay15AndCondDay16 = compileStory({
    start: "daily",
    dayStarts: { 2: "day_02", 15: "day_15", 16: "cond_16" },
    nodes: [
      node("daily", play),
      node("day_02"),
      node("day_15", choice("finish", "finishCrisis", "day_15")),
      node("cond_16", choice("only_f", "interaction", "cond_16", { type: "lockedPreference", value: "F" }))
    ]
  });
  const warnings2 = checkStoryPlayability(blockedDay2WithHealthyDay15AndCondDay16);
  assert.deepEqual(warnings2.map(({ code }) => code), ["ap_blocked", "ap_conditional", "crisis_missing"]);
  assert.doesNotMatch(warnings2[0].message, /獨立檢查 dayStarts 入口/);
  assert.match(warnings2[1].message, /第 16 天（AP 5）節點 cond_16/);
  assert.match(warnings2[1].message, /獨立檢查 dayStarts 入口/);
});
