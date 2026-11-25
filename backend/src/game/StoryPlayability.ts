import { checkEventCondition, type EventCondition } from "./EventConditions.js";
import { completeDay15Event } from "./EventSystem.js";
import { createInitialGameState, type GameState } from "./GameState.js";
import type { CompiledStory } from "./StorySystem.js";
import { advanceDay, spendAP } from "./TimeSystem.js";

export interface StoryWarning {
  code: "unreachable_node" | "ap_blocked" | "crisis_blocked" | "crisis_missing" | "crisis_conditional";
  message: string;
}

// 病患與 MBTI 分數取決於選擇歷史。分別把未知條件視為可用及不可用。
function allows(condition: EventCondition, state: GameState, allowUnknown: boolean): boolean {
  switch (condition.type) {
    case "patient":
      return condition.minimum <= 0 || (condition.minimum <= 100 && allowUnknown);
    case "lockedPreference":
      return state.mbtiLocked && allowUnknown;
    case "all":
      return condition.conditions.length > 0 &&
        condition.conditions.every(item => allows(item, state, allowUnknown));
    case "any":
      return condition.conditions.some(item => allows(item, state, allowUnknown));
    default:
      return checkEventCondition(state, condition);
  }
}

function unusedNodes(story: CompiledStory): string[] {
  const reachable = new Set([story.start, ...story.dayStarts.values(), ...Object.values(story.depthStarts)]);
  for (const id of reachable) {
    for (const choice of story.nodes.get(id)!.choices) reachable.add(choice.next);
  }
  return [...story.nodes.keys()].filter(id => !reachable.has(id));
}

function scanDailyFlow(
  story: CompiledStory,
  allowUnknown: boolean,
  reportBlocked?: (id: string, state: GameState) => void
) {
  let state = createInitialGameState();
  let entries = new Set([story.start]);

  // 第 21 天不需要再換日，正式結局與通關條件仍待確認。
  while (entries.size > 0 && state.day < 21) {
    const beforeCrisis = state.day === 15 && state.flags.length === 0;
    const requiredAction = beforeCrisis ? "finishCrisis" : state.ap > 0 ? "interaction" : undefined;
    const reachable = new Set(entries);
    const predecessors = new Map<string, string[]>();
    const exits = new Set<string>();
    const nextEntries = new Set<string>();

    // 在同一天、同一 AP 下展開對話，循環中的節點只走一次。
    for (const id of reachable) {
      for (const choice of story.nodes.get(id)!.choices) {
        if (choice.condition && !allows(choice.condition, state, allowUnknown)) continue;
        if (choice.action === "dialogue") {
          reachable.add(choice.next);
          const incoming = predecessors.get(choice.next) ?? [];
          incoming.push(id);
          predecessors.set(choice.next, incoming);
        } else if (choice.action === requiredAction) {
          exits.add(id);
          nextEntries.add(choice.next);
        }
      }
    }

    if (requiredAction) {
      // 反向找出能透過對話走到互動或危機完成選項的節點。
      if (reportBlocked) {
        for (const id of exits) {
          for (const previous of predecessors.get(id) ?? []) exits.add(previous);
        }
        for (const id of reachable) {
          if (!exits.has(id)) reportBlocked(id, state);
        }
      }
      if (beforeCrisis && nextEntries.size > 0) {
        if (!reportBlocked) return true;
        state = completeDay15Event(state);
      } else if (!beforeCrisis) {
        state = spendAP(state);
      }
      entries = nextEntries;
    } else {
      state = advanceDay(state);
      const start = story.dayStarts.get(state.day);
      entries = start === undefined ? reachable : new Set([start]);
    }
  }

  return state.flags.length > 0;
}

export function checkStoryPlayability(story: CompiledStory): StoryWarning[] {
  const warnings: StoryWarning[] = unusedNodes(story).map(id => ({
    code: "unreachable_node",
    message: `從起始節點、每日劇情入口或深度劇情入口沿選項連線皆無法抵達節點 ${id}`
  }));
  const blocked = new Map<string, { warning: StoryWarning; count: number }>();
  const canFinishCrisis = scanDailyFlow(story, true, (id, state) => {
    const code = state.day === 15 ? "crisis_blocked" : "ap_blocked";
    const key = JSON.stringify([code, id]);
    const previous = blocked.get(key);
    if (previous) {
      previous.count++;
      return;
    }
    const problem = code === "crisis_blocked"
      ? "找不到通往 finishCrisis 的對話路徑"
      : "找不到能繼續消耗 AP 的互動路徑，現行 API 無法換日";
    blocked.set(key, {
      warning: { code, message: `第 ${state.day} 天（AP ${state.ap}）節點 ${id}：${problem}` },
      count: 1
    });
  });
  for (const { warning, count } of blocked.values()) {
    if (count > 1) warning.message += `（另有 ${count - 1} 個日期／AP 組合）`;
    warnings.push(warning);
  }

  if (!canFinishCrisis) {
    warnings.push({ code: "crisis_missing", message: "從起始節點找不到可在第 15 天執行 finishCrisis 的路徑" });
  } else if (!scanDailyFlow(story, false)) {
    warnings.push({
      code: "crisis_conditional",
      message: "從第 1 天到完成第 15 天事件的路徑，只有在假設未確定的病患數值或 MBTI 條件可成立時才找得到。請試玩確認這些條件能否在同一局達成"
    });
  }
  return warnings;
}
