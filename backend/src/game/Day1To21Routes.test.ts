import assert from "node:assert/strict";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import express from "express";
import { gameRoutes } from "./GameRoutes.js";
import type { GameState } from "./GameState.js";
import { loadStory } from "./loadStory.js";

interface GameView {
  id: string;
  revision: number;
  game: GameState;
  node: { choices: { id: string }[] };
}

type Action = { type: "choose"; choiceId: string } | { type: "advanceDay" };

test("API：同一局從第 1 天走到第 21 天，完成第 15 天事件並拒絕第 22 天", async () => {
  const story = loadStory(fileURLToPath(new URL("../../stories/day-1-21.fixture.json", import.meta.url)));
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
    let state: GameView = await created.json();
    assert.equal(state.revision, 0);
    const gameUrl = `${root}/${state.id}`;

    const send = (action: Action, revision: number) => fetch(`${gameUrl}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...action, revision })
    });

    async function act(action: Action) {
      const revision = state.revision;
      const response = await send(action, revision);
      assert.equal(response.status, 200, `Day ${state.game.day}: ${JSON.stringify(action)}`);
      state = await response.json();
      assert.equal(state.revision, revision + 1);
    }

    async function reject(action: Action, error: string, revision = state.revision) {
      const response = await send(action, revision);
      assert.equal(response.status, 409, `Day ${state.game.day}: ${JSON.stringify(action)}`);
      assert.deepEqual(await response.json(), { error });
      const read = await fetch(gameUrl);
      assert.equal(read.status, 200);
      assert.deepEqual(await read.json(), state);
    }

    const hasChoice = (id: string) => state.node.choices.some(choice => choice.id === id);
    const practice = { type: "choose", choiceId: "practice" } as const;
    const talk = { type: "choose", choiceId: "talk" } as const;
    const finishCrisis = { type: "choose", choiceId: "finish_crisis" } as const;
    const advance = { type: "advanceDay" } as const;

    await reject(advance, "day_unavailable");
    await reject(finishCrisis, "choice_unavailable");
    assert.equal(state.game.mbti.T, 0);
    await act(talk);
    assert.equal(state.game.ap, 5);
    assert.equal(state.game.mbti.T, 1);
    await reject(talk, "stale_revision", 0);

    for (let day = 1; day <= 21; day++) {
      const label = `Day ${day}`;
      assert.equal(state.game.day, day, label);
      assert.equal(state.game.mbtiLocked, day >= 15, label);
      assert.equal(state.game.ap, day === 15 ? 0 : 5, label);
      assert.equal(hasChoice("finish_crisis"), day === 15, label);
      assert.equal(state.game.mbti.F, Math.min(day - 1, 14) * 5, label);
      assert.equal(state.game.mbti.T, 1, label);
      assert.equal(state.game.flags.includes("day15_event_completed"), day > 15, label);

      if (day === 15) {
        assert.equal(hasChoice("practice"), false);
        await reject(practice, "choice_unavailable");
        await reject(advance, "day_unavailable");
        const lockedScores = state.game.mbti;
        await act(talk);
        assert.equal(state.game.ap, 0);
        assert.deepEqual(state.game.mbti, lockedScores);
        await reject(advance, "day_unavailable");

        const revision = state.revision;
        await act(finishCrisis);
        assert(state.game.flags.includes("day15_event_completed"));
        assert.equal(state.game.ap, 0);
        assert.equal(hasChoice("finish_crisis"), false);
        await reject(finishCrisis, "stale_revision", revision);
        await reject(finishCrisis, "choice_unavailable");
      } else {
        const dailyScores = state.game.mbti;
        for (let ap = 4; ap >= 0; ap--) {
          assert.equal(hasChoice("practice"), true, label);
          await act(practice);
          assert.equal(state.game.day, day, label);
          assert.equal(state.game.ap, ap, label);
          if (day > 15) assert.deepEqual(state.game.mbti, dailyScores, label);
        }
        assert.equal(hasChoice("practice"), false, label);
      }

      if (day === 1 || day === 21) await reject(practice, "choice_unavailable");
      if (day < 21) await act(advance);
    }

    await reject(advance, "day_unavailable");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});
