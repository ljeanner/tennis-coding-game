import express from 'express'
const router = express.Router()

import { getPlayer, upsertPlayer } from '../shared/database'

router.get('/:playerId', async (req, res) => {
  const playerId = req.params.playerId
  if (!playerId) return res.status(400).json({ error: 'Player ID is required' })

  try {
    const player = await getPlayer(playerId)
    if (!player) return res.status(404).json({ error: 'Player not found' })
    return res.json(player)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req, res) => {
  const body = req.body as any
  if (!body.playerId || !body.playerName) return res.status(400).json({ error: 'playerId and playerName are required' })

  try {
    const player = await upsertPlayer(body.playerId, body.playerName)
    return res.json(player)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
