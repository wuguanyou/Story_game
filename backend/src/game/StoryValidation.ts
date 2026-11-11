import type { StoryDefinition } from "./StorySystem.js";

const patients = ["A", "B", "C"];
const dimensions = ["E", "I", "S", "N", "T", "F", "J", "P"];
const slots = ["morning", "lateMorning", "afternoon", "evening", "night"];
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function validCondition(value: unknown, depth = 0): boolean {
  if (!record(value) || depth > 32) return false;
  switch (value.type) {
    case "day": return finite(value.value) && Number.isInteger(value.value) && value.value >= 1 && value.value <= 21;
    case "flag": return nonempty(value.value);
    case "slot": return typeof value.value === "string" && slots.includes(value.value);
    case "lockedPreference": return typeof value.value === "string" && dimensions.includes(value.value);
    case "patient":
      return typeof value.patientId === "string" && patients.includes(value.patientId) &&
        (value.field === "trust" || value.field === "healing") && finite(value.minimum);
    case "all":
    case "any":
      return Array.isArray(value.conditions) &&
        value.conditions.every(item => validCondition(item, depth + 1));
    default: return false;
  }
}

function validEffect(value: unknown): boolean {
  if (!record(value) || Object.keys(value).some(key => key !== "patient" && key !== "mbti")) return false;
  const { patient, mbti } = value;
  if (patient !== undefined && (!record(patient) || typeof patient.id !== "string" ||
    !patients.includes(patient.id) || !Object.entries(patient).every(([key, delta]) =>
      key === "id" || ((key === "trust" || key === "healing") && finite(delta))))) return false;
  return mbti === undefined || (record(mbti) && Object.entries(mbti)
    .every(([key, delta]) => dimensions.includes(key) && finite(delta) && delta >= 0));
}

export function validateStoryData(value: unknown): asserts value is StoryDefinition {
  if (!record(value) || !nonempty(value.start) || !Array.isArray(value.nodes)) {
    throw new Error("劇情資料必須包含起始節點與節點清單");
  }
  const starts = value.depthStarts;
  if (starts !== undefined && (!record(starts) || !Object.entries(starts)
    .every(([id, start]) => patients.includes(id) && nonempty(start)))) {
    throw new Error("深度劇情入口資料無效");
  }
  for (const [index, node] of value.nodes.entries()) {
    if (!record(node) || !nonempty(node.id) || typeof node.text !== "string" || !Array.isArray(node.choices)) {
      throw new Error(`節點資料無效：nodes[${index}]`);
    }
    for (const [choiceIndex, choice] of node.choices.entries()) {
      if (!record(choice) || !nonempty(choice.id) || !nonempty(choice.label) || !nonempty(choice.next)) {
        throw new Error(`選項資料無效：${node.id}/choices[${choiceIndex}]`);
      }
      if (choice.condition !== undefined && !validCondition(choice.condition)) {
        throw new Error(`選項條件無效：${node.id}/${choice.id}`);
      }
      if (choice.effect !== undefined && !validEffect(choice.effect)) {
        throw new Error(`選項效果無效：${node.id}/${choice.id}`);
      }
    }
  }
}
