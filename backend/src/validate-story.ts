import { loadStory } from "./game/loadStory.js";

const path = process.argv[2];
try {
  if (!path || process.argv.length !== 3) {
    throw new Error("請提供一個劇情 JSON 路徑");
  }
  const story = loadStory(path);
  console.log(`劇情驗證通過，共 ${story.nodes.size} 個節點，起點為 ${story.start}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
