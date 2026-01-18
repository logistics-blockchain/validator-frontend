import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import type { Address } from 'viem'

export type NetworkStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface NetworkHealth {
  status: NetworkStatus
  activeValidators: number
  totalValidators: number
  blockProductionRate: number // blocks per minute
  missedBlocks: number
  lastBlockTime: bigint
  uptime: number // percentage
  consensusHealth: string
}

export function useNetworkHealth() {
  const [health, setHealth] = useState<NetworkHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isInitialLoad = true

    const checkNetworkHealth = async () => {
      // Only show loading on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        const latestBlockNumber = await publicClient.getBlockNumber()

        // Analyze last 100 blocks for network health metrics
        // With 5-second block time, this covers last ~8.3 minutes
        const desiredBlockCount = 100
        const blockCount = latestBlockNumber < BigInt(desiredBlockCount)
          ? Number(latestBlockNumber) + 1
          : desiredBlockCount

        // Fetch recent blocks
        const blockPromises = []
        const startBlock = latestBlockNumber - BigInt(blockCount) + 1n
        for (let i = startBlock; i <= latestBlockNumber; i++) {
          blockPromises.push(publicClient.getBlock({ blockNumber: i }))
        }

        const blocks = await Promise.all(blockPromises)

        // Get actual validator count from contract
        const VALIDATOR_CONTRACT = '0x0000000000000000000000000000000000009999' as Address
        const abiResponse = await fetch('/artifacts/DynamicMultiSigValidatorManager.json')
        const { abi } = await abiResponse.json()
        const validators = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi,
          functionName: 'getValidators',
        }) as Address[]
        const totalValidators = validators.length

        // Count unique validators from recent blocks
        const uniqueValidators = new Set(blocks.map(b => b.miner.toLowerCase()))
        const activeValidators = uniqueValidators.size

        // Calculate block production rate (blocks per minute)
        const timeSpan = Number(blocks[blocks.length - 1].timestamp - blocks[0].timestamp)
        const blockProductionRate = timeSpan > 0 ? (blocks.length / timeSpan) * 60 : 0

        // Check for missed blocks (gaps in block numbers)
        let missedBlocks = 0
        for (let i = 1; i < blocks.length; i++) {
          const gap = Number(blocks[i].number - blocks[i - 1].number)
          if (gap > 1) {
            missedBlocks += gap - 1
          }
        }

        // Determine network status
        let status: NetworkStatus = 'healthy'
        let consensusHealth = 'Optimal'

        if (activeValidators < totalValidators) {
          if (activeValidators <= totalValidators / 2) {
            status = 'critical'
            consensusHealth = 'Critical - Below Quorum'
          } else {
            status = 'degraded'
            consensusHealth = 'Degraded - Validator(s) Down'
          }
        } else if (missedBlocks > 0) {
          status = 'degraded'
          consensusHealth = 'Degraded - Missed Blocks'
        }

        // Calculate uptime (blocks produced vs expected)
        const expectedBlocks = blockCount
        const actualBlocks = blockCount - missedBlocks
        const uptime = (actualBlocks / expectedBlocks) * 100

        setHealth({
          status,
          activeValidators,
          totalValidators,
          blockProductionRate,
          missedBlocks,
          lastBlockTime: blocks[blocks.length - 1].timestamp,
          uptime,
          consensusHealth,
        })
      } catch (error) {
        console.error('Error checking network health:', error)
        throw error
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          isInitialLoad = false
        }
      }
    }

    checkNetworkHealth()

    // Refresh every 2 seconds (every block) without showing loading state
    const interval = setInterval(checkNetworkHealth, 2000)

    return () => clearInterval(interval)
  }, [])

  return { health, loading }
}
