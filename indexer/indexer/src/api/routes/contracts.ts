import { Router } from 'express'
import {
  getContract,
  getAllContracts,
  insertContract,
} from '../../db/queries.js'
import { decodeAllEventsForContract } from '../../indexer/decoder.js'
import { isValidAddress } from '../validation.js'
import type { ApiResponse, ContractABI } from '../../types.js'

const router = Router()

// GET /api/contracts - List all registered contracts
router.get('/', (_req, res) => {
  const contracts = getAllContracts()

  const response: ApiResponse<ContractABI[]> = {
    success: true,
    data: contracts,
    meta: { total: contracts.length, limit: contracts.length, offset: 0 },
  }
  res.json(response)
})

// GET /api/contracts/:address - Get contract info
router.get('/:address', (req, res) => {
  const { address } = req.params

  if (!isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid address format',
    }
    return res.status(400).json(response)
  }

  const contract = getContract(address)

  if (!contract) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Contract not found',
    }
    return res.status(404).json(response)
  }

  const response: ApiResponse<ContractABI> = {
    success: true,
    data: contract,
  }
  res.json(response)
})

// POST /api/contracts - Register ABI for address
router.post('/', (req, res) => {
  const { address, name, abi, isProxy, implementation } = req.body

  if (!address || !isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid or missing address',
    }
    return res.status(400).json(response)
  }

  // Validate ABI is valid JSON array
  if (abi) {
    try {
      const parsed = JSON.parse(typeof abi === 'string' ? abi : JSON.stringify(abi))
      if (!Array.isArray(parsed)) {
        throw new Error('ABI must be an array')
      }
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid ABI format - must be valid JSON array',
      }
      return res.status(400).json(response)
    }
  }

  const contract: ContractABI = {
    address: address.toLowerCase(),
    name: name || null,
    abi: typeof abi === 'string' ? abi : JSON.stringify(abi),
    isProxy: isProxy || false,
    implementation: implementation || null,
    addedAt: Date.now(),
  }

  insertContract(contract)

  const response: ApiResponse<ContractABI> = {
    success: true,
    data: contract,
  }
  res.status(201).json(response)
})

// POST /api/contracts/:address/decode - Trigger decoding of historical events
router.post('/:address/decode', async (req, res) => {
  const { address } = req.params

  if (!isValidAddress(address)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid address format',
    }
    return res.status(400).json(response)
  }

  const contract = getContract(address)
  if (!contract?.abi) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Contract not found or no ABI registered',
    }
    return res.status(404).json(response)
  }

  try {
    const decodedCount = await decodeAllEventsForContract(address)

    const response: ApiResponse<{ decodedCount: number }> = {
      success: true,
      data: { decodedCount },
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Decode failed',
    }
    res.status(500).json(response)
  }
})

export default router
