import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { indexerService } from '@/services/indexerService'
import { parseAbi } from 'viem'
import type { Address } from 'viem'

const VALIDATOR_CONTRACT = '0x0000000000000000000000000000000000009999' as Address
const VALIDATOR_ABI = parseAbi(['function getValidators() view returns (address[])'])

export interface ValidatorMetrics {
  address: Address
  blocksProduced: number
  lastBlockNumber: bigint
  lastBlockTime: bigint
  isActive: boolean
  uptime: number
}

export interface ValidatorStats {
  validators: ValidatorMetrics[]
  totalBlocks: number
  averageBlockTime: number
  blockTimeVariance: number
  currentBlockNumber: bigint
}

export function useValidatorMetrics(blockCount: number = 1000) {
  const [stats, setStats] = useState<ValidatorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isInitialLoad = true

    const fetchValidatorMetrics = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        // Fetch chain stats for current block number
        const chainStats = await indexerService.getStats()

        // Fetch recent blocks from indexer - use blockCount parameter (up to 1000)
        // Fetch in two batches of 500 to get 1000 blocks
        const targetBlocks = Math.min(blockCount, 1000)
        const batchSize = 500
        let allBlocks: Awaited<ReturnType<typeof indexerService.getBlocks>>['blocks'] = []

        for (let offset = 0; offset < targetBlocks; offset += batchSize) {
          const limit = Math.min(batchSize, targetBlocks - offset)
          try {
            const { blocks: batch } = await indexerService.getBlocks(limit, offset)
            allBlocks = allBlocks.concat(batch)
            if (batch.length < limit) break // No more blocks available
          } catch (err) {
            console.warn(`Failed to fetch blocks at offset ${offset}:`, err)
            break
          }
        }

        const blocks = allBlocks

        // Calculate block time stats from recent blocks
        const blockTimes: number[] = []
        let totalBlockTime = 0

        for (let i = 1; i < blocks.length; i++) {
          const blockTime = blocks[i - 1].timestamp - blocks[i].timestamp
          blockTimes.push(blockTime)
          totalBlockTime += blockTime
        }

        const averageBlockTime = blockTimes.length > 0 ? totalBlockTime / blockTimes.length : 0

        let blockTimeVariance = 0
        if (blockTimes.length > 1) {
          const squaredDiffs = blockTimes.map((time) => Math.pow(time - averageBlockTime, 2))
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / blockTimes.length
          blockTimeVariance = Math.sqrt(variance)
        }

        // Fetch all validators from the contract for live status
        let contractValidators: Address[] = []
        try {
          contractValidators = (await publicClient.readContract({
            address: VALIDATOR_CONTRACT,
            abi: VALIDATOR_ABI,
            functionName: 'getValidators',
          })) as Address[]
        } catch (error) {
          console.warn('Failed to fetch validators from contract:', error)
        }

        const now = Math.floor(Date.now() / 1000)

        // Count blocks per miner from the fetched blocks (not all-time stats)
        const minerBlockCounts = new Map<string, number>()
        const latestBlocksByMiner = new Map<string, { number: number; timestamp: number }>()

        for (const block of blocks) {
          const miner = block.miner.toLowerCase()
          // Skip zero address
          if (miner === '0x0000000000000000000000000000000000000000') continue

          minerBlockCounts.set(miner, (minerBlockCounts.get(miner) || 0) + 1)

          if (!latestBlocksByMiner.has(miner)) {
            latestBlocksByMiner.set(miner, { number: block.number, timestamp: block.timestamp })
          }
        }

        // Only use contract validators (active validators), filter out zero address
        const allValidatorAddresses = new Set<string>(
          contractValidators
            .map((addr) => addr.toLowerCase())
            .filter((addr) => addr !== '0x0000000000000000000000000000000000000000')
        )

        const analyzedBlockCount = blocks.length
        const activeValidatorCount = allValidatorAddresses.size || 4
        const expectedBlocksPerValidator = analyzedBlockCount / activeValidatorCount

        const validators: ValidatorMetrics[] = Array.from(allValidatorAddresses).map((addressLower) => {
          const blocksProduced = minerBlockCounts.get(addressLower) || 0
          const latestBlock = latestBlocksByMiner.get(addressLower)

          const lastBlockTime = latestBlock?.timestamp || 0
          const timeSinceLastBlock = now - lastBlockTime
          const isActive = timeSinceLastBlock < 60

          const uptime = expectedBlocksPerValidator > 0
            ? Math.min(100, (blocksProduced / expectedBlocksPerValidator) * 100)
            : 0

          return {
            address: addressLower as Address,
            blocksProduced,
            lastBlockNumber: BigInt(latestBlock?.number || 0),
            lastBlockTime: BigInt(lastBlockTime),
            isActive,
            uptime,
          }
        })

        validators.sort((a, b) => b.blocksProduced - a.blocksProduced)

        setStats({
          validators,
          totalBlocks: analyzedBlockCount,
          averageBlockTime,
          blockTimeVariance,
          currentBlockNumber: BigInt(chainStats.lastIndexedBlock),
        })
      } catch (error) {
        console.error('Error fetching validator metrics:', error)
        setStats(null)
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          isInitialLoad = false
        }
      }
    }

    fetchValidatorMetrics()

    const interval = setInterval(fetchValidatorMetrics, 2000)

    return () => clearInterval(interval)
  }, [blockCount])

  return { stats, loading }
}
