
import type { GameState, PatientId } from "./GameState.js";
import { validateStoryData } from "./StoryValidation.js";

import type { EventCondition } from "./EventConditions.js";

import { checkEventCondition } from "./EventConditions.js";
import { applyChoiceEffects, type ChoiceEffect } from "./GameEngine.js";
import { advanceDay, spendAP } from "./TimeSystem.js";
import { completeDay15Event } from "./EventSystem.js";

// 定義一個劇情選項的資料格式
export interface StoryChoice {
  id: string;
  label: string;
  next: string;
  condition?: EventCondition;
  effect?: ChoiceEffect;
  action?: "interaction" | "dialogue" | "finishCrisis";
}

export interface StoryDefinition {
  start: string;
  nodes: readonly StoryNode[];
  depthStarts?: Partial<Record<PatientId, string>>;
}

export interface StoryProgress {
  node: string;
  game: GameState;
  pendingDepth: Partial<Record<"A" | "B" | "C", number>>;
  activeDepth?: { patient: PatientId; resumeNode: string };
  completedDepth?: PatientId[];
}

export function compileStory(input: unknown) {
  validateStoryData(input);
  const definition = input;
  const nodes = new Map<string, StoryNode>();
  for (const node of definition.nodes) {
    if (!node.id.trim() || nodes.has(node.id)) throw new Error("劇情節點 ID 無效或重複");
    nodes.set(node.id, node);
  }
  if (!nodes.has(definition.start)) throw new Error("缺少起始節點");
  for (const node of nodes.values()) {
    const ids = new Set<string>();
    for (const choice of node.choices) {
      if (!choice.id.trim() || ids.has(choice.id)) throw new Error(`選項 ID 無效或重複：${node.id}`);
      if (!nodes.has(choice.next)) throw new Error(`找不到目標節點：${choice.next}`);
      if (choice.action !== "interaction" && choice.action !== "dialogue" && choice.action !== "finishCrisis") {
        throw new Error(`選項必須指定有效的動作：${node.id}/${choice.id}`);
      }
      ids.add(choice.id);
    }
  }
  for (const start of Object.values(definition.depthStarts ?? {})) {
    if (!nodes.has(start)) throw new Error(`找不到深度劇情節點：${start}`);
    const visited = new Set<string>();
    const queue = [start];
    const endings: string[] = [];
    const predecessors = new Map<string, string[]>();
    while (queue.length) {
      const id = queue.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodes.get(id)!;
      if (node.choices.length === 0) endings.push(id);
      for (const choice of node.choices) {
        if (choice.action !== "dialogue") {
          throw new Error(`深度劇情只能使用對話選項：${id}/${choice.id}`);
        }
        if (!choice.condition) {
          const incoming = predecessors.get(choice.next) ?? [];
          incoming.push(id);
          predecessors.set(choice.next, incoming);
        }
        queue.push(choice.next);
      }
    }
    const canEnd = new Set<string>();
    while (endings.length) {
      const id = endings.pop()!;
      if (canEnd.has(id)) continue;
      canEnd.add(id);
      for (const previous of predecessors.get(id) ?? []) endings.push(previous);
    }
    for (const id of visited) {
      if (!canEnd.has(id)) throw new Error(`深度劇情節點無法抵達結尾：${id} 缺少不受條件限制的路徑`);
    }
  }
  return { start: definition.start, nodes, depthStarts: definition.depthStarts ?? {} };
}

export type CompiledStory = ReturnType<typeof compileStory>;

export function currentStoryNode(story: CompiledStory, progress: StoryProgress): StoryNode {
  const node = story.nodes.get(progress.node);
  if (!node) throw new Error("找不到目前的劇情節點");
  return node;
}

export function selectStoryChoice(
  story: CompiledStory, progress: StoryProgress, choiceId: string
): StoryProgress | undefined {
  const node = currentStoryNode(story, progress);
  const choice = storyChoices(story, progress).find(item => item.id === choiceId);
  if (!choice) return undefined;
  if (!story.nodes.has(choice.next)) throw new Error("找不到目標節點");

  let game = choice.action === "interaction" ? spendAP(progress.game) : progress.game;
  game = choice.effect ? applyChoiceEffects(game, choice.effect) : game;
  if (choice.action === "finishCrisis") game = completeDay15Event(game);
  const pendingDepth = { ...progress.pendingDepth };
  for (const id of ["A", "B", "C"] as const) {
    const before = progress.game.patients[id];
    const after = game.patients[id];
    const crossed = (before.healing <= 50 && after.healing > 50)
      || (before.trust <= 50 && after.trust > 50);
    if (crossed && game.day >= 4 && game.day <= 14 && !progress.completedDepth?.includes(id)) {
      pendingDepth[id] ??= game.day + 1;
    }
  }
  return {
    ...progress,
    node: choice.next,
    pendingDepth,
    game: { ...game, history: [...game.history, JSON.stringify([node.id, choice.id])] }
  };
}

export function storyChoices(story: CompiledStory, progress: StoryProgress): StoryChoice[] {
  const choices = getAvailableChoices(progress.game, currentStoryNode(story, progress));
  return progress.activeDepth ? choices.filter(choice => choice.action === "dialogue") : choices;
}

export function advanceStoryDay(progress: StoryProgress, story?: CompiledStory): StoryProgress {
  if (progress.activeDepth) throw new Error("必須先完成深度劇情");
  const game = advanceDay(progress.game);
  const updated = { ...progress, game };
  if (!story || game.day === 15) return updated;
  const due = (["A", "B", "C"] as const).filter(id => progress.pendingDepth[id] === game.day);
  if (due.length !== 1) return updated;
  const patient = due[0];
  const start = story.depthStarts[patient];
  if (!start) return updated;
  return { ...updated, node: start, activeDepth: { patient, resumeNode: progress.node } };
}

export function finishDepth(story: CompiledStory, progress: StoryProgress): StoryProgress | undefined {
  const active = progress.activeDepth;
  if (!active || currentStoryNode(story, progress).choices.length !== 0) return undefined;
  const pendingDepth = { ...progress.pendingDepth };
  delete pendingDepth[active.patient];
  return {
    ...progress, node: active.resumeNode, pendingDepth, activeDepth: undefined,
    completedDepth: [...(progress.completedDepth ?? []), active.patient]
  };
}

// 定義劇情節點
export interface StoryNode {
  id: string;
  text: string;
  choices: StoryChoice[];
}

// 取得玩家目前可以選擇的選項
export function getAvailableChoices(
  state: GameState,
  node: StoryNode
): StoryChoice[] {

  return node.choices.filter((choice) => {
    if (choice.action === "interaction" && (state.ap <= 0 || state.day === 15)) return false;
    if (choice.action === "finishCrisis" &&
      (state.day !== 15 || !state.mbtiLocked || state.flags.includes("day15_event_completed"))) return false;

    // 沒有設定條件，就直接顯示
    if (!choice.condition) {
      return true;
    }

    // 有條件時，交給 EventConditions 判斷
    return checkEventCondition(
      state,
      choice.condition
    );
  });
}
