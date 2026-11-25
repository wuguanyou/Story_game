import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const directory = "src/game";
const files = readdirSync(directory)
  .filter(file => file.endsWith(".test.ts"))
  .map(file => `${directory}/${file}`);

if (files.length === 0) {
  throw new Error(`No test files found in ${directory}`);
}

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  stdio: "inherit"
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
