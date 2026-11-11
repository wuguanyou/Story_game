
import type {
  GameState,
  MBTIDimension,
  PatientId,
  PatientState
} from "./GameState.js";

const opposite: Record<MBTIDimension, MBTIDimension> = {
  E: "I", I: "E", S: "N", N: "S", T: "F", F: "T", J: "P", P: "J"
};

// 定義事件觸發條件
export type EventCondition =
  | { type: "day"; value: number }
  | { type: "lockedPreference"; value: MBTIDimension }
  | { type: "slot"; value: "morning" | "lateMorning" | "afternoon" | "evening" | "night" }
  | { type: "flag"; value: string }
  | {
      type: "patient";
      patientId: PatientId;
      field: keyof PatientState;
      minimum: number;
    }
  | {
      type: "all";
      conditions: EventCondition[];
    }
  | {
      type: "any";
      conditions: EventCondition[];
    };

// 判斷事件是否符合條件
export function checkEventCondition(
  state: GameState,
  condition: EventCondition
): boolean {

  switch (condition.type) {

    // 日期必須符合
    case "day":
      return state.day === condition.value;

    case "lockedPreference":
      return state.mbtiLocked && state.mbti[condition.value] > state.mbti[opposite[condition.value]];

    case "slot":
      return state.day !== 15 && state.ap > 0 &&
        ["morning", "lateMorning", "afternoon", "evening", "night"][5 - state.ap] === condition.value;

    // 必須具有事件標記
    case "flag":
      return state.flags.includes(condition.value);

    // 病患數值必須達到門檻
    case "patient":
      return (
        state.patients[condition.patientId][condition.field]
        >= condition.minimum
      );

    // AND：全部條件都符合
    case "all":
      if (condition.conditions.length === 0) {
        return false;
      }

      return condition.conditions.every((item) =>
        checkEventCondition(state, item)
      );

    // OR：至少一個條件符合
    case "any":
      if (condition.conditions.length === 0) {
        return false;
      }

      return condition.conditions.some((item) =>
        checkEventCondition(state, item)
      );
  }
}
