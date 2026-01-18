import { Router } from 'express'
import { getBridgePayments, getTotalBridgePayments } from '../../db/queries.js'
import { getBridgeSyncStatus } from '../../indexer/bridgeSync.js'
import { sanitizeLimit, sanitizeOffset } from '../validation.js'
import type { ApiResponse } from '../../types.js'
import type { BridgePayment } from '../../types.js'

const router = Router()

// GET /api/bridge/payments - Get all bridge payments
router.get('/payments', (req, res) => {
  const limit = sanitizeLimit(req.query.limit, 100)
  const offset = sanitizeOffset(req.query.offset)

  const payments = getBridgePayments(limit, offset)
  const total = getTotalBridgePayments()

  const response: ApiResponse<BridgePayment[]> = {
    success: true,
    data: payments,
    meta: { total, limit, offset },
  }
  res.json(response)
})

// GET /api/bridge/status - Get bridge sync status
router.get('/status', (_req, res) => {
  const status = getBridgeSyncStatus()

  const response: ApiResponse<{ lastSyncedBlock: number; isSyncing: boolean }> = {
    success: true,
    data: status,
  }
  res.json(response)
})

export default router
