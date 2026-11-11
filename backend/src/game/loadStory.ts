import { readFileSync } from "node:fs";
import { compileStory } from "./StorySystem.js";

export function loadStory(path: string) {
  try {
    return compileStory(JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`無法載入劇情檔 ${path}\n${message}`, { cause: error });
  }
}
