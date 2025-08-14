import express from 'express'
const router = express.Router()

import { updatePlayerScore, getPlayerScoreHistory } from '../shared/database'

router.post('/', async (req, res) => {
  try {
    const body = req.body as any
    if (!body.playerId || typeof body.score !== 'number') return res.status(400).json({ error: 'playerId and score are required' })

    const updatedPlayer = await updatePlayerScore(body.playerId, body.score)
    return res.json(updatedPlayer)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// If you need score history
router.get('/:playerId/history', async (req, res) => {
  try {
    const playerId = req.params.playerId
    const history = await getPlayerScoreHistory(playerId)
    return res.json(history)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
