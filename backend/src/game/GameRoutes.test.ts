import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { demoStory } from "./DemoStory.js";
import { gameRoutes } from "./GameRoutes.js";
import { compileStory } from "./StorySystem.js";

test("建立進度、扣除 AP、拒絕重送並讀回進度", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/games", gameRoutes(compileStory(demoStory)));
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const root = `http://127.0.0.1:${address.port}/api/games`;
    const created = await fetch(root, { method: "POST" });
    assert.equal(created.status, 201);
    const initial = await created.json();
    const url = `${root}/${initial.id}`;
    const send = () => fetch(`${url}/actions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "choose", choiceId: "interact", revision: 0 })
    });
    const accepted = await send();
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).game.ap, 4);
    const rejected = await send();
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).error, "stale_revision");
    const read = await fetch(url);
    assert.equal((await read.json()).game.ap, 4);
  } finally {
    server.close();
  }
});
