import { checkEventCondition, type EventCondition } from "./EventConditions.js";
import { completeDay15Event } from "./EventSystem.js";
import {
  createInitialGameState,
  type GameState,
  type MBTIDimension,
  type PatientId,
  type PatientState
} from "./GameState.js";
import type { CompiledStory } from "./StorySystem.js";
import { advanceDay, spendAP } from "./TimeSystem.js";

export interface StoryWarning {
  code:
    | "unreachable_node"
    | "ap_blocked"
    | "ap_conditional"
    | "crisis_blocked"
    | "crisis_missing"
    | "crisis_conditional";
  message: string;
}

type PatientStatKey = `${PatientId}.${keyof PatientState}`;

// 病患數值最早可能透過正向 effect 變為 > 0 的時機層級：
// 0: 日常可達節點的 dialogue（第 1 天 AP 5 即可能觸發）
// 1: 日常可達節點的 interaction（至少消耗 1 AP 後，即 day > 1 或 ap < 5）
// 2: 僅存在於 depthStarts 節點（最快第 5 天進入深度劇情後）
// 3: 僅存在於 finishCrisis 選項（第 15 天完成危機後或第 16 天起）
// Infinity: 全劇情可達節點皆無正向效果，數值永遠為 0
const RANK_DIALOGUE = 0;
const RANK_INTERACTION = 1;
const RANK_DEPTH = 2;
const RANK_CRISIS = 3;

const mbtiBits: Record<MBTIDimension, number> = {
  E: 1, I: 2, S: 4, N: 8, T: 16, F: 32, J: 64, P: 128
};

function isConsistentMbtiMask(mask: number): boolean {
  return (mask & 3) !== 3
    && (mask & 12) !== 12
    && (mask & 48) !== 48
    && (mask & 192) !== 192;
}

function unionMasks(first: number[], second: number[]): number[] {
  if (first.length === 0) return second;
  if (second.length === 0) return first;
  if (first.includes(0) || second.includes(0)) return [0];
  const merged = new Set(first);
  for (const mask of second) merged.add(mask);
  return [...merged];
}

function intersectMasks(first: number[], second: number[]): number[] {
  if (first.length === 0 || second.length === 0) return [];
  const merged = new Set<number>();
  for (const left of first) {
    for (const right of second) {
      const combined = left | right;
      if (isConsistentMbtiMask(combined)) merged.add(combined);
    }
  }
  return [...merged];
}

function collectReachable(story: CompiledStory, roots: Iterable<string>): Set<string> {
  const reachable = new Set(roots);
  for (const id of reachable) {
    const node = story.nodes.get(id);
    if (!node) continue;
    for (const choice of node.choices) reachable.add(choice.next);
  }
  return reachable;
}

function analyzePatientReachability(
  story: CompiledStory,
  dailyReachable: Set<string>,
  allReachable: Set<string>
): Map<PatientStatKey, number> {
  const ranks = new Map<PatientStatKey, number>();
  const record = (patientId: PatientId, field: keyof PatientState, rank: number) => {
    const key: PatientStatKey = `${patientId}.${field}`;
    const current = ranks.get(key) ?? Infinity;
    if (rank < current) ranks.set(key, rank);
  };

  for (const id of allReachable) {
    const node = story.nodes.get(id);
    if (!node) continue;
    const inDaily = dailyReachable.has(id);
    for (const choice of node.choices) {
      const patient = choice.effect?.patient;
      if (!patient) continue;
      let rank: number;
      if (!inDaily) {
        rank = RANK_DEPTH;
      } else if (choice.action === "dialogue") {
        rank = RANK_DIALOGUE;
      } else if (choice.action === "interaction") {
        rank = RANK_INTERACTION;
      } else {
        rank = RANK_CRISIS;
      }
      if ((patient.trust ?? 0) > 0) record(patient.id, "trust", rank);
      if ((patient.healing ?? 0) > 0) record(patient.id, "healing", rank);
    }
  }
  return ranks;
}

function canReachPositivePatient(
  patientId: PatientId,
  field: keyof PatientState,
  state: GameState,
  ranks: Map<PatientStatKey, number>
): boolean {
  const rank = ranks.get(`${patientId}.${field}`) ?? Infinity;
  if (rank === RANK_DIALOGUE) return true;
  if (rank === RANK_INTERACTION) return state.day > 1 || state.ap < 5;
  if (rank === RANK_DEPTH) return state.day >= 5;
  if (rank === RANK_CRISIS) {
    return state.day >= 16 || (state.day === 15 && state.flags.includes("day15_event_completed"));
  }
  return false;
}

function isGuaranteed(condition: EventCondition, state: GameState): boolean {
  switch (condition.type) {
    case "patient":
      return condition.minimum <= 0;
    case "lockedPreference":
      return false;
    case "all":
      return condition.conditions.length > 0 &&
        condition.conditions.every(item => isGuaranteed(item, state));
    case "any":
      return condition.conditions.some(item => isGuaranteed(item, state));
    default:
      return checkEventCondition(state, condition);
  }
}

// 計算條件在給定靜態狀態下所有可能成立的互斥一致 MBTI 遮罩集合（最多 3^4 = 81 種）。
// 回傳空陣列表示在任何動態歷史下皆不可能成立。
function possibleMasks(
  condition: EventCondition,
  state: GameState,
  patientRanks: Map<PatientStatKey, number>
): number[] {
  switch (condition.type) {
    case "patient":
      if (condition.minimum <= 0) return [0];
      if (condition.minimum > 100) return [];
      return canReachPositivePatient(condition.patientId, condition.field, state, patientRanks) ? [0] : [];
    case "lockedPreference":
      return state.mbtiLocked ? [mbtiBits[condition.value]] : [];
    case "all": {
      if (condition.conditions.length === 0) return [];
      let acc = [0];
      for (const item of condition.conditions) {
        acc = intersectMasks(acc, possibleMasks(item, state, patientRanks));
        if (acc.length === 0) return [];
      }
      return acc;
    }
    case "any": {
      let acc: number[] = [];
      for (const item of condition.conditions) {
        acc = unionMasks(acc, possibleMasks(item, state, patientRanks));
      }
      return acc;
    }
    default:
      return checkEventCondition(state, condition) ? [0] : [];
  }
}

interface ScanReport {
  code: "ap_blocked" | "ap_conditional" | "crisis_blocked" | "crisis_conditional";
  id: string;
  state: GameState;
  independent: boolean;
}

function scanDailyFlow(
  story: CompiledStory,
  initialState: GameState,
  initialEntries: Set<string>,
  patientRanks: Map<PatientStatKey, number>,
  reachedDays: Set<number>,
  independent: boolean,
  report: (entry: ScanReport) => void
): boolean {
  let state = initialState;
  let entries = new Set(initialEntries);
  let finishedCrisis = state.flags.includes("day15_event_completed");

  // 第 21 天不需要再換日，正式結局與通關條件仍待確認。
  while (entries.size > 0 && state.day < 21) {
    reachedDays.add(state.day);
    const beforeCrisis = state.day === 15 && !state.flags.includes("day15_event_completed");
    const requiredAction = beforeCrisis ? "finishCrisis" : state.ap > 0 ? "interaction" : undefined;
    const possibleReachable = new Set(entries);
    const possiblePredecessors = new Map<string, string[]>();
    const possibleExits = new Set<string>();
    const guaranteedPredecessors = new Map<string, string[]>();
    const guaranteedExits = new Set<string>();
    const nextEntries = new Set<string>();

    // 在同一天、同一 AP 下展開對話，循環中的節點只走一次。
    for (const id of possibleReachable) {
      for (const choice of story.nodes.get(id)!.choices) {
        const guaranteed = !choice.condition || isGuaranteed(choice.condition, state);
        const possible = guaranteed || possibleMasks(choice.condition!, state, patientRanks).length > 0;
        if (!possible) continue;

        if (choice.action === "dialogue") {
          possibleReachable.add(choice.next);
          const incomingPossible = possiblePredecessors.get(choice.next) ?? [];
          incomingPossible.push(id);
          possiblePredecessors.set(choice.next, incomingPossible);
          if (guaranteed) {
            const incomingGuaranteed = guaranteedPredecessors.get(choice.next) ?? [];
            incomingGuaranteed.push(id);
            guaranteedPredecessors.set(choice.next, incomingGuaranteed);
          }
        } else if (choice.action === requiredAction) {
          possibleExits.add(id);
          nextEntries.add(choice.next);
          if (guaranteed) guaranteedExits.add(id);
        }
      }
    }

    if (requiredAction) {
      for (const id of possibleExits) {
        for (const previous of possiblePredecessors.get(id) ?? []) possibleExits.add(previous);
      }
      for (const id of guaranteedExits) {
        for (const previous of guaranteedPredecessors.get(id) ?? []) guaranteedExits.add(previous);
      }
      for (const id of possibleReachable) {
        if (!possibleExits.has(id)) {
          report({
            code: beforeCrisis ? "crisis_blocked" : "ap_blocked",
            id,
            state,
            independent
          });
        } else if (!guaranteedExits.has(id)) {
          report({
            code: beforeCrisis ? "crisis_conditional" : "ap_conditional",
            id,
            state,
            independent
          });
        }
      }

      if (beforeCrisis && nextEntries.size > 0) {
        state = completeDay15Event(state);
        finishedCrisis = true;
      } else if (!beforeCrisis) {
        state = spendAP(state);
      }
      entries = nextEntries;
    } else {
      state = advanceDay(state);
      const start = story.dayStarts.get(state.day);
      entries = start === undefined ? possibleReachable : new Set([start]);
    }
  }

  return finishedCrisis;
}

function canFinishCrisisUnconditionallyFromStart(story: CompiledStory): boolean {
  let state = createInitialGameState();
  let entries = new Set([story.start]);

  while (entries.size > 0 && state.day < 21) {
    const beforeCrisis = state.day === 15 && !state.flags.includes("day15_event_completed");
    const requiredAction = beforeCrisis ? "finishCrisis" : state.ap > 0 ? "interaction" : undefined;
    const reachable = new Set(entries);
    const nextEntries = new Set<string>();

    for (const id of reachable) {
      for (const choice of story.nodes.get(id)!.choices) {
        if (choice.condition && !isGuaranteed(choice.condition, state)) continue;
        if (choice.action === "dialogue") {
          reachable.add(choice.next);
        } else if (choice.action === requiredAction) {
          nextEntries.add(choice.next);
        }
      }
    }

    if (requiredAction) {
      if (beforeCrisis && nextEntries.size > 0) return true;
      if (!beforeCrisis) state = spendAP(state);
      entries = nextEntries;
    } else {
      state = advanceDay(state);
      const start = story.dayStarts.get(state.day);
      entries = start === undefined ? reachable : new Set([start]);
    }
  }

  return false;
}

function createIndependentDayState(day: number): GameState {
  return {
    ...createInitialGameState(),
    day,
    ap: day === 15 ? 0 : 5,
    mbtiLocked: day >= 15,
    flags: day >= 16 ? ["day15_event_completed"] : []
  };
}

export function checkStoryPlayability(story: CompiledStory): StoryWarning[] {
  const dailyReachable = collectReachable(story, [story.start, ...story.dayStarts.values()]);
  const allReachable = collectReachable(story, [...dailyReachable, ...Object.values(story.depthStarts)]);
  const patientRanks = analyzePatientReachability(story, dailyReachable, allReachable);

  const warnings: StoryWarning[] = [...story.nodes.keys()]
    .filter(id => !allReachable.has(id))
    .map(id => ({
      code: "unreachable_node",
      message: `從起始節點、每日劇情入口或深度劇情入口沿選項連線皆無法抵達節點 ${id}`
    }));

  const aggregated = new Map<string, { warning: StoryWarning; count: number }>();
  let hasMainCrisisConditional = false;

  const recordWarning = ({ code, id, state, independent }: ScanReport) => {
    if (code === "crisis_conditional" && !independent) hasMainCrisisConditional = true;
    const key = JSON.stringify([code, id, independent]);
    const previous = aggregated.get(key);
    if (previous) {
      previous.count++;
      return;
    }
    const problem = code === "crisis_blocked"
      ? "找不到通往 finishCrisis 的對話路徑"
      : code === "crisis_conditional"
        ? "通往 finishCrisis 的路徑僅在假設未確定的病患數值或 MBTI 條件成立時可用，請試玩確認"
        : code === "ap_conditional"
          ? "消耗 AP 的互動路徑僅在假設未確定的病患數值或 MBTI 條件成立時可用，請試玩確認"
          : "找不到能繼續消耗 AP 的互動路徑，現行 API 無法換日";
    const scopeNote = independent ? "（獨立檢查 dayStarts 入口，前置天數未從第 1 天抵達）" : "";
    aggregated.set(key, {
      warning: { code, message: `第 ${state.day} 天（AP ${state.ap}）節點 ${id}${scopeNote}：${problem}` },
      count: 1
    });
  };

  const reachedDays = new Set<number>();
  const canFinishCrisisFromStart = scanDailyFlow(
    story,
    createInitialGameState(),
    new Set([story.start]),
    patientRanks,
    reachedDays,
    false,
    recordWarning
  );

  // 若前置天數卡關導致主流程中斷，仍獨立檢查後續明確設定的 dayStarts（第 2～20 天）。
  const unreachedDayStarts = [...story.dayStarts.keys()]
    .filter(day => day >= 2 && day <= 20)
    .sort((a, b) => a - b);

  for (const day of unreachedDayStarts) {
    if (reachedDays.has(day)) continue;
    const startNode = story.dayStarts.get(day)!;
    scanDailyFlow(
      story,
      createIndependentDayState(day),
      new Set([startNode]),
      patientRanks,
      reachedDays,
      true,
      recordWarning
    );
  }

  for (const { warning, count } of aggregated.values()) {
    if (count > 1) warning.message += `（另有 ${count - 1} 個日期／AP 組合）`;
    warnings.push(warning);
  }

  if (!canFinishCrisisFromStart) {
    warnings.push({ code: "crisis_missing", message: "從起始節點找不到可在第 15 天執行 finishCrisis 的路徑" });
  } else if (!hasMainCrisisConditional && !canFinishCrisisUnconditionallyFromStart(story)) {
    warnings.push({
      code: "crisis_conditional",
      message: "從第 1 天到完成第 15 天事件的路徑，只有在假設未確定的病患數值或 MBTI 條件可成立時才找得到。請試玩確認這些條件能否在同一局達成"
    });
  }
  return warnings;
}
