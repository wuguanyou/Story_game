import type { StoryDefinition } from "./StorySystem.js";

export const demoStory: StoryDefinition = {
  start: "demo",
  nodes: [{
    id: "demo",
    text: "後端串接測試",
    choices: [{ id: "interact", label: "測試互動", next: "demo", action: "interaction" }]
  }]
};
