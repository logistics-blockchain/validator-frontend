import { Router } from 'express'
import {
  getTransaction,
  getTransactions,
  getTotalTransactions,
  getEventsByTx,
} from '../../db/queries.js'
import { isValidHash, sanitizeLimit, sanitizeOffset } from '../validation.js'
import type { ApiResponse, IndexedTransaction, IndexedEvent } from '../../types.js'

const router = Router()

// GET /api/transactions - List recent transactions
router.get('/', (req, res) => {
  const limit = sanitizeLimit(req.query.limit, 20)
  const offset = sanitizeOffset(req.query.offset)

  const transactions = getTransactions(limit, offset)
  const total = getTotalTransactions()

  const response: ApiResponse<IndexedTransaction[]> = {
    success: true,
    data: transactions,
    meta: { total, limit, offset },
  }
  res.json(response)
})

// GET /api/transactions/:hash - Single transaction with events
router.get('/:hash', (req, res) => {
  const { hash } = req.params

  if (!isValidHash(hash)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid transaction hash',
    }
    return res.status(400).json(response)
  }

  const tx = getTransaction(hash)

  if (!tx) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Transaction not found',
    }
    return res.status(404).json(response)
  }

  const events = getEventsByTx(hash)

  const response: ApiResponse<{ transaction: IndexedTransaction; events: IndexedEvent[] }> = {
    success: true,
    data: { transaction: tx, events },
  }
  res.json(response)
})

export default router
