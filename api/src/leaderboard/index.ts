import express from 'express';
const router = express.Router();

import { getLeaderboard, getBestMatchTimers } from '../shared/database';

router.get('/', async (req, res) => {
  try {
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const leaderboard = await getLeaderboard(limit);
    return res.json(leaderboard);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/timers', async (req, res) => {
  try {
    const difficulty = (req.query.difficulty as string) || null;
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    const leaderboard = await getBestMatchTimers(difficulty, limit);
    return res.json(leaderboard);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
