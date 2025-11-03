import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import type { Address } from 'viem'

export interface ValidatorMetrics {
  address: Address
  blocksProduced: number
  lastBlockNumber: bigint
  lastBlockTime: bigint
  isActive: boolean
  uptime: number // percentage
}

export interface ValidatorStats {
  validators: ValidatorMetrics[]
  totalBlocks: number
  averageBlockTime: number
  blockTimeVariance: number // Standard deviation of block times
  currentBlockNumber: bigint
}

export function useValidatorMetrics(blockCount: number = 100) {
  const [stats, setStats] = useState<ValidatorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isInitialLoad = true

    const fetchValidatorMetrics = async () => {
      // Only show loading on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        const latestBlock = await publicClient.getBlockNumber()
        const startBlock = latestBlock - BigInt(blockCount) + 1n

        // Fetch recent blocks
        const blockPromises = []
        for (let i = startBlock; i <= latestBlock; i++) {
          blockPromises.push(publicClient.getBlock({ blockNumber: i }))
        }

        const blocks = await Promise.all(blockPromises)

        // Aggregate validator metrics
        const validatorMap = new Map<Address, {
          blocksProduced: number
          lastBlockNumber: bigint
          lastBlockTime: bigint
          blockNumbers: bigint[]
        }>()

        // Calculate block times and variance
        const blockTimes: number[] = []
        let totalBlockTime = 0n

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i]
          const validator = block.miner

          if (!validatorMap.has(validator)) {
            validatorMap.set(validator, {
              blocksProduced: 0,
              lastBlockNumber: 0n,
              lastBlockTime: 0n,
              blockNumbers: [],
            })
          }

          const vData = validatorMap.get(validator)!
          vData.blocksProduced++
          vData.blockNumbers.push(block.number)

          if (block.number > vData.lastBlockNumber) {
            vData.lastBlockNumber = block.number
            vData.lastBlockTime = block.timestamp
          }

          // Calculate block time differences
          if (i > 0) {
            const blockTime = Number(block.timestamp - blocks[i - 1].timestamp)
            blockTimes.push(blockTime)
            totalBlockTime += block.timestamp - blocks[i - 1].timestamp
          }
        }

        const averageBlockTime = blocks.length > 1
          ? Number(totalBlockTime) / (blocks.length - 1)
          : 0

        // Calculate variance (standard deviation) of block times
        let blockTimeVariance = 0
        if (blockTimes.length > 1) {
          const squaredDiffs = blockTimes.map(time => Math.pow(time - averageBlockTime, 2))
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / blockTimes.length
          blockTimeVariance = Math.sqrt(variance)
        }

        // Calculate uptime and active status
        const now = Math.floor(Date.now() / 1000)
        const validators: ValidatorMetrics[] = Array.from(validatorMap.entries()).map(([address, data]) => {
          const timeSinceLastBlock = now - Number(data.lastBlockTime)
          const isActive = timeSinceLastBlock < 60 // Active if produced block in last minute

          // Uptime calculation: blocks produced / expected blocks
          // In QBFT with 4 validators, each should produce ~25% of blocks
          const expectedBlocks = blockCount / 4
          const uptime = Math.min(100, (data.blocksProduced / expectedBlocks) * 100)

          return {
            address,
            blocksProduced: data.blocksProduced,
            lastBlockNumber: data.lastBlockNumber,
            lastBlockTime: data.lastBlockTime,
            isActive,
            uptime,
          }
        })

        // Sort alphabetically by address
        validators.sort((a, b) => a.address.toLowerCase().localeCompare(b.address.toLowerCase()))

        setStats({
          validators,
          totalBlocks: blocks.length,
          averageBlockTime,
          blockTimeVariance,
          currentBlockNumber: latestBlock,
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

    // Refresh every 2 seconds (every block) without showing loading state
    const interval = setInterval(fetchValidatorMetrics, 2000)

    return () => clearInterval(interval)
  }, [blockCount])

  return { stats, loading }
}
