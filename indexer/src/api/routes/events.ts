import { Router } from 'express'
import { getEventsByTopic } from '../../db/queries.js'
import { isValidHash, sanitizeLimit, sanitizeOffset } from '../validation.js'
import type { ApiResponse, IndexedEvent } from '../../types.js'

const router = Router()

// GET /api/events?topic0=0x... - Events by topic signature
router.get('/', (req, res) => {
  const limit = sanitizeLimit(req.query.limit, 50)
  const offset = sanitizeOffset(req.query.offset)
  const { topic0 } = req.query

  if (!topic0 || typeof topic0 !== 'string') {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Must provide topic0 filter or use /api/address/:address/events',
    }
    return res.status(400).json(response)
  }

  if (!isValidHash(topic0)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid topic0 format',
    }
    return res.status(400).json(response)
  }

  const events = getEventsByTopic(topic0, limit, offset)

  const response: ApiResponse<IndexedEvent[]> = {
    success: true,
    data: events,
    meta: { limit, offset },
  }
  res.json(response)
})

export default router
