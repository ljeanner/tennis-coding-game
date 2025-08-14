import path from 'path';
import dotenv from 'dotenv';
// Load env from api/.env even if process.cwd() is repository root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';

// Import all function handlers
import playersRouter from './players';
import scoresRouter from './scores';
import leaderboardRouter from './leaderboard';
import { getDbPool } from './shared/database';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/players', playersRouter);
app.use('/scores', scoresRouter);
app.use('/leaderboard', leaderboardRouter);

// health check
app.get('/health', (_req, res) => res.status(200).send('OK'));
// optional DB health check
app.get('/health/db', async (_req, res) => {
  try {
    const pool = await getDbPool();
    await pool.request().query('SELECT 1 AS ok');
    res.status(200).send('DB OK');
  } catch (e) {
    console.error('DB health failed:', e);
    res.status(500).send('DB NOT OK');
  }
});

// Try to connect to DB on startup and fail fast if it doesn't work
getDbPool()
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('Database connection failed on startup:', err?.message || err);
    // Exit so developer sees the failure immediately instead of getting runtime errors later
    process.exit(1);
  });

const port = process.env.PORT || 7000;
app.listen(port, () => console.log(`API listening on ${port}`));

// This file is the main entry point that registers all functions
export default app;
