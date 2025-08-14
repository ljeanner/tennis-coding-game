import express from 'express';
const router = express.Router();

import { recordMatch } from '../shared/database';

router.post('/', async (req, res) => {
  try {
    const { playerId, difficulty, durationMs } = req.body || {};
    if (!playerId || !difficulty || typeof durationMs !== 'number') {
      return res.status(400).json({ error: 'playerId, difficulty, and durationMs are required' });
    }

    const match = await recordMatch(playerId, difficulty, durationMs);
    return res.json(match);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
