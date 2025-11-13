import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
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

        // Fetch all validators from the contract
        let contractValidators: Address[] = []
        try {
          contractValidators = await publicClient.readContract({
            address: VALIDATOR_CONTRACT,
            abi: VALIDATOR_ABI,
            functionName: 'getValidators',
          }) as Address[]
        } catch (error) {
          console.warn('Failed to fetch validators from contract, using block data only:', error)
        }

        // Calculate uptime and active status
        const now = Math.floor(Date.now() / 1000)

        // Normalize validatorMap to lowercase keys for case-insensitive lookup
        const normalizedValidatorMap = new Map<string, typeof validatorMap extends Map<any, infer V> ? V : never>()
        validatorMap.forEach((value, key) => {
          normalizedValidatorMap.set(key.toLowerCase(), value)
        })

        // Create a set of all validator addresses (normalized to lowercase to avoid duplicates)
        const allValidatorAddressesLower = new Set<string>([
          ...contractValidators.map(addr => addr.toLowerCase()),
          ...Array.from(normalizedValidatorMap.keys())
        ])

        const validators: ValidatorMetrics[] = Array.from(allValidatorAddressesLower).map((addressLower) => {
          const data = normalizedValidatorMap.get(addressLower)

          if (!data) {
            // Validator exists in contract but hasn't produced any blocks
            return {
              address: addressLower as Address,
              blocksProduced: 0,
              lastBlockNumber: 0n,
              lastBlockTime: 0n,
              isActive: false,
              uptime: 0,
            }
          }

          const timeSinceLastBlock = now - Number(data.lastBlockTime)
          const isActive = timeSinceLastBlock < 60 // Active if produced block in last minute

          // Uptime calculation: blocks produced / expected blocks
          // Expected blocks = total blocks / number of active validators
          const activeValidatorCount = contractValidators.length || 4 // Fallback to 4 if contract query fails
          const expectedBlocks = blockCount / activeValidatorCount
          const uptime = Math.min(100, (data.blocksProduced / expectedBlocks) * 100)

          return {
            address: addressLower as Address,
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
