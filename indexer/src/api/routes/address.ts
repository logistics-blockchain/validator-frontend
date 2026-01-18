import { Router } from 'express'
import {
  getAddressTransactions,
  getEventsByAddress,
  getEventsWithDecoded,
} from '../../db/queries.js'
import {
  isValidAddress,
  sanitizeLimit,
  sanitizeOffset,
  sanitizeDirection,
} from '../validation.js'
import type { ApiResponse, IndexedTransaction, IndexedEvent, DecodedEvent } from '../../types.js'

const router = Router()

// GET /api/address/:address/transactions - Transactions for address
router.get('/:address/transactions', (req, res) => {
  const { address } = req.params

  if (!isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid address format',
    }
    return res.status(400).json(response)
  }

  const limit = sanitizeLimit(req.query.limit, 50)
  const offset = sanitizeOffset(req.query.offset)
  const direction = sanitizeDirection(req.query.direction)

  const transactions = getAddressTransactions(address, limit, offset, direction)

  const response: ApiResponse<IndexedTransaction[]> = {
    success: true,
    data: transactions,
    meta: { limit, offset },
  }
  res.json(response)
})

// GET /api/address/:address/events - Events emitted by contract
router.get('/:address/events', (req, res) => {
  const { address } = req.params

  if (!isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid address format',
    }
    return res.status(400).json(response)
  }

  const limit = sanitizeLimit(req.query.limit, 50)
  const offset = sanitizeOffset(req.query.offset)

  const events = getEventsByAddress(address, limit, offset)

  const response: ApiResponse<IndexedEvent[]> = {
    success: true,
    data: events,
    meta: { limit, offset },
  }
  res.json(response)
})

// GET /api/address/:address/events/decoded - Events with decoded data
router.get('/:address/events/decoded', (req, res) => {
  const { address } = req.params

  if (!isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid address format',
    }
    return res.status(400).json(response)
  }

  const limit = sanitizeLimit(req.query.limit, 50)
  const offset = sanitizeOffset(req.query.offset)

  const events = getEventsWithDecoded(address, limit, offset)

  const response: ApiResponse<Array<IndexedEvent & { decoded?: DecodedEvent }>> = {
    success: true,
    data: events,
    meta: { limit, offset },
  }
  res.json(response)
})

export default router
