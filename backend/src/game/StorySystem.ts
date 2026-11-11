
import type { GameState } from "./GameState.js";

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
}

export interface StoryProgress {
  node: string;
  game: GameState;
  pendingDepth: Partial<Record<"A" | "B" | "C", number>>;
}

export function compileStory(definition: StoryDefinition) {
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
  return { start: definition.start, nodes };
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
  const choice = getAvailableChoices(progress.game, node).find(item => item.id === choiceId);
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
    if (crossed && game.day >= 4 && game.day <= 14) pendingDepth[id] ??= game.day + 1;
  }
  return {
    node: choice.next,
    pendingDepth,
    game: { ...game, history: [...game.history, JSON.stringify([node.id, choice.id])] }
  };
}

export function advanceStoryDay(progress: StoryProgress): StoryProgress {
  return { ...progress, game: advanceDay(progress.game) };
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
