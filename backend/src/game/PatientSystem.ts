
import type {
  GameState,
  PatientId
} from "./GameState.js";

// 定義病患數值的變化
interface PatientChanges {
  healing?: number;
  trust?: number;
}

// 把數值限制在 0～100
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// 更新指定病患的數值
export function applyPatientEffect(
  state: GameState,
  patientId: PatientId,
  changes: PatientChanges
): GameState {

  const patient = state.patients[patientId];

  const healingDelta = changes.healing ?? 0;
  const trustDelta = changes.trust ?? 0;

  if (
    !Number.isFinite(healingDelta) ||
    !Number.isFinite(trustDelta)
  ) {
    throw new Error("病患數值變化必須是有效數字");
  }

  return {
    ...state,
    patients: {
      ...state.patients,
      [patientId]: {
        ...patient,
        healing: clamp(patient.healing + healingDelta),
        trust: clamp(patient.trust + trustDelta)
      }
    }
  };
}
