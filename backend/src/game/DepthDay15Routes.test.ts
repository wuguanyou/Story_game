import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { gameRoutes } from "./GameRoutes.js";
import { compileStory } from "./StorySystem.js";

const story = compileStory({
  start: "daily",
  depthStarts: { A: "depth_a" },
  nodes: [{
    id: "daily", text: "每日",
    choices: [
      { id: "practice", label: "練習", next: "daily", action: "interaction" },
      { id: "crossA", label: "A 跨越門檻", next: "daily", action: "interaction",
        effect: { patient: { id: "A", trust: 51 } } },
      { id: "crossB", label: "B 跨越門檻", next: "daily", action: "interaction",
        effect: { patient: { id: "B", healing: 51 } } },
      { id: "talk", label: "對話", next: "daily", action: "dialogue", effect: { mbti: { F: 1 } } },
      { id: "crisis", label: "完成危機", next: "daily", action: "finishCrisis" }
    ]
  }, {
    id: "depth_a", text: "A 深度",
    choices: [{ id: "continue", label: "繼續", next: "depth_a_end", action: "dialogue" }]
  }, { id: "depth_a_end", text: "結束", choices: [] }]
});

interface GameView {
  id: string;
  revision: number;
  game: { day: number; ap: number; mbtiLocked: boolean; mbti: Record<string, number>; flags: string[] };
  pendingDepth: Record<string, number>;
  activeDepth: string | null;
  canFinishDepth: boolean;
  node: { id: string; choices: { id: string; label: string }[] };
}

async function withGame(run: (client: ReturnType<typeof createClient>) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/api/games", gameRoutes(story));
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const root = `http://127.0.0.1:${address.port}/api/games`;
    const created = await fetch(root, { method: "POST" });
    assert.equal(created.status, 201);
    await run(createClient(root, await created.json()));
  } finally {
    server.close();
  }
}

function createClient(root: string, initial: GameView) {
  let state = initial;
  const url = `${root}/${initial.id}`;
  const raw = (body: unknown, id = initial.id) => fetch(`${root}/${id}/actions`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const client = {
    get state() { return state; },
    root, url, raw,
    send: (type: string, choiceId?: string) => raw({ type, choiceId, revision: state.revision }),
    async act(type: string, choiceId?: string) {
      const response = await client.send(type, choiceId);
      assert.equal(response.status, 200, `${type} ${choiceId ?? ""} 應成功`);
      state = await response.json();
      return state;
    },
    async reject(status: number, error: string, type: string, choiceId?: string) {
      const before = state.revision;
      const response = await client.send(type, choiceId);
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { error });
      const read: GameView = await (await fetch(url)).json();
      assert.equal(read.revision, before, "被拒絕的動作不能改變進度");
    },
    /** 用完當天 AP 並換日；cross 依日期指定當天前幾次互動要選的選項 */
    async playUntil(day: number, cross: Partial<Record<number, string[]>> = {}) {
      while (state.game.day < day) {
        const special = cross[state.game.day] ?? [];
        for (let ap = 0; ap < 5; ap++) {
          await client.act("choose", special[ap] ?? "practice");
        }
        await client.act("advanceDay");
      }
    }
  };
  return client;
}

test("API：第 3 天跨越 50 不排程，第 4 天跨越則隔天進入深度劇情", async () => {
  await withGame(async client => {
    await client.playUntil(4, { 3: ["crossA"] });
    assert.deepEqual(client.state.pendingDepth, {});
    assert.equal(client.state.activeDepth, null);
  });
  await withGame(async client => {
    await client.playUntil(5, { 4: ["crossA"] });
    assert.equal(client.state.game.day, 5);
    assert.equal(client.state.activeDepth, "A");
    assert.equal(client.state.node.id, "depth_a");
  });
});

test("API：深度劇情中只能對話、不消耗 AP、不能換日，完成後回原節點且不能重複完成", async () => {
  await withGame(async client => {
    await client.playUntil(5, { 4: ["crossA"] });
    assert.deepEqual(client.state.node.choices.map(choice => choice.id), ["continue"]);
    assert.equal(client.state.canFinishDepth, false);
    await client.reject(409, "choice_unavailable", "choose", "practice");
    await client.reject(409, "day_unavailable", "advanceDay");
    await client.reject(409, "depth_unavailable", "finishDepth");

    await client.act("choose", "continue");
    assert.equal(client.state.game.ap, 5);
    assert.equal(client.state.canFinishDepth, true);
    assert.deepEqual(client.state.node.choices, []);

    await client.act("finishDepth");
    assert.equal(client.state.node.id, "daily");
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.canFinishDepth, false);
    assert.equal(client.state.game.ap, 5);
    assert.deepEqual(client.state.pendingDepth, {});
    await client.reject(409, "depth_unavailable", "finishDepth");

    await client.playUntil(7);
    assert.equal(client.state.activeDepth, null);
  });
});

test("API：同日多位到期或到期病患沒有入口時不進入深度劇情", async () => {
  await withGame(async client => {
    await client.playUntil(5, { 4: ["crossA", "crossB"] });
    assert.deepEqual(client.state.pendingDepth, { A: 5, B: 5 });
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.node.id, "daily");
  });
  await withGame(async client => {
    await client.playUntil(5, { 4: ["crossB"] });
    assert.deepEqual(client.state.pendingDepth, { B: 5 });
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.node.id, "daily");
  });
});

test("API：第 15 天鎖定 MBTI、AP 為 0、不能互動，完成強制事件後才能進入第 16 天", async () => {
  await withGame(async client => {
    await client.playUntil(15, { 14: ["crossA"] });
    const day15 = client.state;
    assert.equal(day15.game.day, 15);
    assert.equal(day15.game.ap, 0);
    assert.equal(day15.game.mbtiLocked, true);
    assert.equal(day15.activeDepth, null);
    assert.deepEqual(day15.pendingDepth, { A: 15 });
    assert.deepEqual(day15.node.choices.map(choice => choice.id), ["talk", "crisis"]);

    await client.reject(409, "choice_unavailable", "choose", "practice");
    await client.reject(409, "choice_unavailable", "choose", "crossA");
    await client.reject(409, "day_unavailable", "advanceDay");

    await client.act("choose", "talk");
    assert.deepEqual(client.state.game.mbti, day15.game.mbti);
    assert.equal(client.state.game.ap, 0);
    await client.reject(409, "day_unavailable", "advanceDay");

    await client.act("choose", "crisis");
    assert(client.state.game.flags.includes("day15_event_completed"));
    await client.reject(409, "choice_unavailable", "choose", "crisis");

    await client.act("advanceDay");
    assert.equal(client.state.game.day, 16);
    assert.equal(client.state.game.ap, 5);
    assert.equal(client.state.game.mbtiLocked, true);
    assert(!client.state.node.choices.some(choice => choice.id === "crisis"));
  });
});

test("API：第 14 天以前不能完成強制事件，AP 未用完不能換日", async () => {
  await withGame(async client => {
    await client.reject(409, "choice_unavailable", "choose", "crisis");
    await client.reject(409, "day_unavailable", "advanceDay");
    await client.playUntil(14);
    await client.reject(409, "choice_unavailable", "choose", "crisis");
  });
});

test("API：finishDepth 與 advanceDay 的請求格式、版本與進度 ID 錯誤", async () => {
  await withGame(async client => {
    const cases: [unknown, number, string][] = [
      [{ type: "finishDepth" }, 400, "invalid_action"],
      [{ type: "finishDepth", revision: "0" }, 400, "invalid_action"],
      [{ type: "finishDepth", revision: 1.5 }, 400, "invalid_action"],
      [{ type: "advanceDay", revision: null }, 400, "invalid_action"],
      [{ type: "completeCrisis", revision: 0 }, 400, "invalid_action"],
      [{ type: "choose", choiceId: " ", revision: 0 }, 400, "invalid_action"],
      [{ type: "finishDepth", revision: 1 }, 409, "stale_revision"],
      [{ type: "advanceDay", revision: -1 }, 409, "stale_revision"]
    ];
    for (const [body, status, error] of cases) {
      const response = await client.raw(body);
      assert.equal(response.status, status, JSON.stringify(body));
      assert.deepEqual(await response.json(), { error });
    }
    const missing = await client.raw({ type: "finishDepth", revision: 0 }, "missing-game");
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "game_not_found" });
    const read: GameView = await (await fetch(client.url)).json();
    assert.equal(read.revision, 0);
  });
});
