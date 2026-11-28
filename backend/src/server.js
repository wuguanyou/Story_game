import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory } from './game/loadStory.js';
import express from 'express';
import { gameRoutes } from './game/GameRoutes.js';
import { compileStory } from './game/StorySystem.js';
import { demoStory } from './game/DemoStory.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(currentDir, '../../frontend/dist');
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'interactive-story-api' }));
app.get('/api/version', (_req, res) => res.json({ name: 'Interactive Story Starter', version: '0.1.0' }));

const storyFile = process.env.GAME_STORY_FILE;
const story = storyFile ? loadStory(storyFile)
  : process.env.ENABLE_GAME_DEMO === '1' ? compileStory(demoStory) : undefined;
app.use('/api/games', gameRoutes(story));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'body_too_large' });
  console.error(error);
  return res.status(500).json({ error: 'internal_error' });
});
app.listen(port, '0.0.0.0', () => console.log('Server listening on port ' + port));
