
import type {
  GameState,
  PatientId,
  MBTIDimension
} from "./GameState.js";

import { applyPatientEffect } from "./PatientSystem.js";
import { applyMBTIEffect } from "./MBTISystem.js";

// 定義一個選項可以產生的效果
export interface ChoiceEffect {
  patient?: {
    id: PatientId;
    healing?: number;
    trust?: number;
  };

  mbti?: Partial<Record<MBTIDimension, number>>;
}

// 執行玩家選項的效果
export function applyChoiceEffects(
  state: GameState,
  effect: ChoiceEffect
): GameState {

  let newState = state;

  // 1. 如果有病患效果，就更新病患
  if (effect.patient) {
    newState = applyPatientEffect(
      newState,
      effect.patient.id,
      {
        healing: effect.patient.healing,
        trust: effect.patient.trust
      }
    );
  }

  // 2. 如果有 MBTI 效果，就更新性格
  if (effect.mbti) {
    newState = applyMBTIEffect(
      newState,
      effect.mbti
    );
  }

  // 3. 回傳更新後的遊戲狀態
  return newState;
}
