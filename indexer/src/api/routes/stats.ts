import { Router } from 'express'
import {
  getTotalBlocks,
  getTotalTransactions,
  getTotalEvents,
  getAllContracts,
  getValidatorStats,
} from '../../db/queries.js'
import { getSyncStatus } from '../../indexer/sync.js'
import type { ApiResponse } from '../../types.js'

const router = Router()

interface ChainStats {
  totalBlocks: number
  totalTransactions: number
  totalEvents: number
  totalContracts: number
  syncStatus: string
  lastIndexedBlock: number
}

interface ValidatorStat {
  miner: string
  blockCount: number
  percentage: number
}

// GET /api/stats - Chain statistics
router.get('/', (_req, res) => {
  const { status, lastIndexedBlock } = getSyncStatus()

  const stats: ChainStats = {
    totalBlocks: getTotalBlocks(),
    totalTransactions: getTotalTransactions(),
    totalEvents: getTotalEvents(),
    totalContracts: getAllContracts().length,
    syncStatus: status,
    lastIndexedBlock,
  }

  const response: ApiResponse<ChainStats> = {
    success: true,
    data: stats,
  }
  res.json(response)
})

// GET /api/stats/validators - Validator block production stats
router.get('/validators', (_req, res) => {
  const rawStats = getValidatorStats()
  const totalBlocks = getTotalBlocks()

  const stats: ValidatorStat[] = rawStats.map((s) => ({
    miner: s.miner,
    blockCount: s.blockCount,
    percentage: totalBlocks > 0 ? (s.blockCount / totalBlocks) * 100 : 0,
  }))

  const response: ApiResponse<ValidatorStat[]> = {
    success: true,
    data: stats,
    meta: { total: stats.length, limit: stats.length, offset: 0 },
  }
  res.json(response)
})

export default router
