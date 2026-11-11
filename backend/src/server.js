import 'dotenv/config';
import { loadStory } from './game/loadStory.js';
import express from 'express';
import { gameRoutes } from './game/GameRoutes.js';
import { compileStory } from './game/StorySystem.js';
import { demoStory } from './game/DemoStory.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'interactive-story-api' }));
app.get('/api/version', (_req, res) => res.json({ name: 'Interactive Story Starter', version: '0.1.0' }));

const storyFile = process.env.GAME_STORY_FILE;
const story = storyFile ? loadStory(storyFile)
  : process.env.ENABLE_GAME_DEMO === '1' ? compileStory(demoStory) : undefined;
app.use('/api/games', gameRoutes(story));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'body_too_large' });
  console.error(error);
  return res.status(500).json({ error: 'internal_error' });
});
app.listen(port, '127.0.0.1', () => console.log(`API http://127.0.0.1:${port}`));
