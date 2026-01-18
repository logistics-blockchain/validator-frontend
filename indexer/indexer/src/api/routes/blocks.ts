import { Router } from 'express'
import {
  getBlock,
  getBlocks,
  getTotalBlocks,
  getTransactionsByBlock,
} from '../../db/queries.js'
import {
  isValidBlockNumber,
  sanitizeLimit,
  sanitizeOffset,
} from '../validation.js'
import type { ApiResponse, IndexedBlock, IndexedTransaction } from '../../types.js'

const router = Router()

// GET /api/blocks - List recent blocks
router.get('/', (req, res) => {
  const limit = sanitizeLimit(req.query.limit, 20)
  const offset = sanitizeOffset(req.query.offset)

  const blocks = getBlocks(limit, offset)
  const total = getTotalBlocks()

  const response: ApiResponse<IndexedBlock[]> = {
    success: true,
    data: blocks,
    meta: { total, limit, offset },
  }
  res.json(response)
})

// GET /api/blocks/:number - Single block
router.get('/:number', (req, res) => {
  const { number } = req.params

  if (!isValidBlockNumber(number)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid block number',
    }
    return res.status(400).json(response)
  }

  const block = getBlock(parseInt(number, 10))

  if (!block) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Block not found',
    }
    return res.status(404).json(response)
  }

  const response: ApiResponse<IndexedBlock> = {
    success: true,
    data: block,
  }
  res.json(response)
})

// GET /api/blocks/:number/transactions - Transactions in block
router.get('/:number/transactions', (req, res) => {
  const { number } = req.params

  if (!isValidBlockNumber(number)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid block number',
    }
    return res.status(400).json(response)
  }

  const transactions = getTransactionsByBlock(parseInt(number, 10))

  const response: ApiResponse<IndexedTransaction[]> = {
    success: true,
    data: transactions,
    meta: { total: transactions.length, limit: transactions.length, offset: 0 },
  }
  res.json(response)
})

export default router
