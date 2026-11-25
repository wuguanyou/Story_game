import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { gameRoutes } from "./GameRoutes.js";
import { compileStory, type StoryDefinition } from "./StorySystem.js";

const definition: StoryDefinition = {
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
      { id: "setB50", label: "B 信任 +50", next: "daily", action: "interaction",
        effect: { patient: { id: "B", trust: 50 } } },
      { id: "talk", label: "對話", next: "daily", action: "dialogue", effect: { mbti: { F: 1 } } },
      { id: "chatB", label: "B 信任 +1 對話", next: "daily", action: "dialogue",
        effect: { patient: { id: "B", trust: 1 } } },
      { id: "goGarden", label: "前往花園", next: "garden", action: "dialogue" },
      { id: "crisis", label: "完成危機", next: "daily", action: "finishCrisis" }
    ]
  }, {
    // 與 story.start 不同的日常節點，用來確認深度劇情結束後回到真正的原節點
    id: "garden", text: "花園",
    choices: [
      { id: "practice", label: "練習", next: "garden", action: "interaction" },
      { id: "crossA", label: "A 跨越門檻", next: "garden", action: "interaction",
        effect: { patient: { id: "A", trust: 51 } } },
      { id: "lowerA", label: "A 信任 -1", next: "garden", action: "interaction",
        effect: { patient: { id: "A", trust: -1 } } },
      { id: "raiseA", label: "A 信任 +1", next: "garden", action: "interaction",
        effect: { patient: { id: "A", trust: 1 } } }
    ]
  }, {
    id: "depth_a", text: "A 深度",
    choices: [{ id: "continue", label: "繼續", next: "depth_a_end", action: "dialogue" }]
  }, { id: "depth_a_end", text: "結束", choices: [] }]
};
const story = compileStory(definition);

interface GameView {
  id: string;
  revision: number;
  game: {
    day: number; ap: number; mbtiLocked: boolean; mbti: Record<string, number>; flags: string[];
    patients: Record<string, { trust: number; healing: number }>;
  };
  pendingDepth: Record<string, number>;
  activeDepth: string | null;
  canFinishDepth: boolean;
  node: { id: string; choices: { id: string; label: string }[] };
}

async function withGame(run: (client: ReturnType<typeof createClient>) => Promise<void>, scenario = story) {
  const app = express();
  app.use(express.json());
  app.use("/api/games", gameRoutes(scenario));
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
    /** 送出指定 body，確認被拒絕，並重新 GET 確認完整進度與最後一次成功回應相同 */
    async rejectBody(status: number, error: string, body: unknown) {
      const response = await raw(body);
      assert.equal(response.status, status, JSON.stringify(body));
      assert.deepEqual(await response.json(), { error });
      const read = await fetch(url);
      assert.equal(read.status, 200);
      assert.deepEqual(await read.json(), state, "被拒絕的動作不能改變進度");
    },
    async reject(status: number, error: string, type: string, choiceId?: string): Promise<void> {
      await client.rejectBody(status, error, { type, choiceId, revision: state.revision });
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

test("API：換日切換每日入口，深度劇情完成後回到新一天的入口", async () => {
  const scenario = compileStory({
    ...definition,
    dayStarts: { 2: "garden", 5: "day_05" },
    nodes: [...definition.nodes, { id: "day_05", text: "第 5 天", choices: [] }]
  });
  await withGame(async client => {
    assert.equal(client.state.node.id, "daily");
    await client.playUntil(2);
    assert.equal(client.state.node.id, "garden");
    assert.equal(client.state.game.ap, 5);
    await client.playUntil(4);
    assert.equal(client.state.node.id, "garden");
    await client.playUntil(5, { 4: ["crossA"] });
    assert.equal(client.state.node.id, "depth_a");
    assert.equal(client.state.activeDepth, "A");
    await client.act("choose", "continue");
    const finished = await client.act("finishDepth");
    assert.equal(finished.node.id, "day_05");
    assert.equal(finished.game.day, 5);
    assert.equal(finished.game.ap, 5);
    assert.equal(finished.activeDepth, null);
    const read = await fetch(client.url);
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), finished);
  }, scenario);
  await withGame(async client => {
    await client.playUntil(5);
    assert.equal(client.state.node.id, "day_05");
    assert.equal(client.state.activeDepth, null);
  }, scenario);
});

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
    await client.playUntil(4);
    await client.act("choose", "goGarden");
    assert.equal(client.state.node.id, "garden");
    assert.notEqual(client.state.node.id, story.start);
    assert.equal(client.state.game.ap, 5);
    for (const choiceId of ["crossA", "practice", "practice", "practice", "practice"]) {
      await client.act("choose", choiceId);
    }
    assert.deepEqual(client.state.pendingDepth, { A: 5 });

    const advanceRevision = client.state.revision;
    await client.act("advanceDay");
    assert.equal(client.state.game.day, 5);
    assert.equal(client.state.activeDepth, "A");
    assert.equal(client.state.node.id, "depth_a");
    await client.rejectBody(409, "stale_revision", { type: "advanceDay", revision: advanceRevision });

    assert.deepEqual(client.state.node.choices.map(choice => choice.id), ["continue"]);
    assert.equal(client.state.canFinishDepth, false);
    await client.reject(409, "choice_unavailable", "choose", "practice");
    await client.reject(409, "day_unavailable", "advanceDay");
    await client.reject(409, "depth_unavailable", "finishDepth");

    await client.act("choose", "continue");
    assert.equal(client.state.game.ap, 5);
    assert.equal(client.state.canFinishDepth, true);
    assert.deepEqual(client.state.node.choices, []);

    const finishRevision = client.state.revision;
    await client.act("finishDepth");
    assert.equal(client.state.node.id, "garden");
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.canFinishDepth, false);
    assert.equal(client.state.game.ap, 5);
    assert.deepEqual(client.state.pendingDepth, {});
    await client.rejectBody(409, "stale_revision", { type: "finishDepth", revision: finishRevision });
    await client.reject(409, "depth_unavailable", "finishDepth");

    // 完成後讓 A 信任 51→50→51，真正再次跨越門檻
    assert.equal(client.state.game.patients.A.trust, 51);
    await client.act("choose", "lowerA");
    assert.equal(client.state.game.patients.A.trust, 50);
    assert.equal(client.state.game.ap, 4);
    await client.act("choose", "raiseA");
    assert.equal(client.state.game.patients.A.trust, 51);
    assert.equal(client.state.game.ap, 3);
    assert.deepEqual(client.state.pendingDepth, {});

    for (let ap = 0; ap < 3; ap++) await client.act("choose", "practice");
    assert.equal(client.state.game.ap, 0);
    await client.act("advanceDay");
    assert.equal(client.state.game.day, 6);
    assert.equal(client.state.game.ap, 5);
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.node.id, "garden");
    assert.deepEqual(client.state.pendingDepth, {});

    await client.playUntil(7);
    assert.equal(client.state.activeDepth, null);
    assert.equal(client.state.node.id, "garden");
    assert.deepEqual(client.state.pendingDepth, {});
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
    await client.playUntil(15, { 13: ["setB50"], 14: ["crossA"] });
    const day15 = client.state;
    assert.equal(day15.game.day, 15);
    assert.equal(day15.game.ap, 0);
    assert.equal(day15.game.mbtiLocked, true);
    assert.equal(day15.activeDepth, null);
    assert.deepEqual(day15.pendingDepth, { A: 15 });
    assert.deepEqual(day15.node.choices.map(choice => choice.id), ["talk", "chatB", "goGarden", "crisis"]);

    // 第 15 天以對話讓 B 信任由 50 變 51，不新增深度劇情排程
    assert.equal(day15.game.patients.B.trust, 50);
    await client.act("choose", "chatB");
    assert.equal(client.state.game.patients.B.trust, 51);
    assert.equal(client.state.game.ap, 0);
    assert.deepEqual(client.state.pendingDepth, { A: 15 });

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

    const day15Revision = client.state.revision;
    await client.act("advanceDay");
    await client.rejectBody(409, "stale_revision", { type: "advanceDay", revision: day15Revision });
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
