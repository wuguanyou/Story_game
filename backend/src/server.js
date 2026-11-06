import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 3001);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'interactive-story-api' }));
app.get('/api/version', (_req, res) => res.json({ name: 'Interactive Story Starter', version: '0.1.0' }));

// TODO: add authenticated users, character relationships and persistent saves here.
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.listen(port, '127.0.0.1', () => console.log(`API http://127.0.0.1:${port}`));
