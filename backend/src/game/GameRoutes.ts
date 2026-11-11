import { randomUUID } from "node:crypto";
import { Router } from "express";
import { createInitialGameState } from "./GameState.js";
import {
  advanceStoryDay, currentStoryNode, getAvailableChoices, selectStoryChoice,
  type CompiledStory, type StoryProgress
} from "./StorySystem.js";

export function gameRoutes(story?: CompiledStory) {
  const router = Router();
  const sessions = new Map<string, { revision: number; progress: StoryProgress }>();

  function view(id: string, session: { revision: number; progress: StoryProgress }) {
    const node = currentStoryNode(story!, session.progress);
    return {
      id, revision: session.revision, game: session.progress.game,
      pendingDepth: session.progress.pendingDepth,
      node: {
        id: node.id, text: node.text,
        choices: getAvailableChoices(session.progress.game, node)
          .map(({ id, label }) => ({ id, label }))
      }
    };
  }

  router.use((_req, res, next) => {
    if (!story) return res.status(503).json({ error: "story_unconfigured" });
    res.set("Cache-Control", "no-store");
    next();
  });
  router.post("/", (_req, res) => {
    if (sessions.size >= 100) return res.status(503).json({ error: "session_limit" });
    const id = randomUUID();
    const session = {
      revision: 0,
      progress: { node: story!.start, game: createInitialGameState(), pendingDepth: {} }
    };
    sessions.set(id, session);
    return res.status(201).json(view(id, session));
  });
  router.get("/:id", (req, res) => {
    const session = sessions.get(req.params.id);
    return session ? res.json(view(req.params.id, session))
      : res.status(404).json({ error: "game_not_found" });
  });
  router.post("/:id/actions", (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: "game_not_found" });
    const { revision, type, choiceId } = req.body ?? {};
    if (!Number.isSafeInteger(revision) ||
        (type !== "choose" && type !== "advanceDay") ||
        (type === "choose" && (typeof choiceId !== "string" || !choiceId.trim()))) {
      return res.status(400).json({ error: "invalid_action" });
    }
    if (revision !== session.revision) {
      return res.status(409).json({ error: "stale_revision" });
    }
    let progress: StoryProgress | undefined;
    if (type === "choose") {
      progress = selectStoryChoice(story!, session.progress, choiceId);
      if (!progress) return res.status(409).json({ error: "choice_unavailable" });
    } else {
      if (session.progress.game.ap > 0 || session.progress.game.day >= 21 ||
          (session.progress.game.day === 15 &&
            !session.progress.game.flags.includes("day15_event_completed"))) {
        return res.status(409).json({ error: "day_unavailable" });
      }
      progress = advanceStoryDay(session.progress);
    }
    const updated = { revision: revision + 1, progress };
    const response = view(req.params.id, updated);
    sessions.set(req.params.id, updated);
    return res.json(response);
  });
  return router;
}
