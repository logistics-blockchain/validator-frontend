import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'
import type { TransactionLog } from '@/types/explorer'
import type { Address, Hash } from 'viem'

/**
 * Event with transaction context
 */
export interface EventWithContext extends TransactionLog {
  transactionHash: Hash
  blockNumber: bigint
  timestamp?: bigint
}

/**
 * Hook to fetch events emitted by a specific contract address
 * Uses eth_getLogs for efficient event retrieval
 */
export function useAddressEvents(address: Address | null) {
  const [events, setEvents] = useState<EventWithContext[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setEvents([])
      return
    }

    const loadEvents = async () => {
      setLoading(true)
      try {
        console.log('[AddressEvents] Fetching events for', address)

        // Get current block number
        const latestBlockNumber = await publicClient.getBlockNumber()

        // Besu has a max range limit for eth_getLogs (typically 1000 blocks)
        // We need to batch the queries
        const BATCH_SIZE = 1000n
        const allLogs: any[] = []

        for (let fromBlock = 0n; fromBlock <= latestBlockNumber; fromBlock += BATCH_SIZE) {
          const toBlock = fromBlock + BATCH_SIZE - 1n > latestBlockNumber
            ? latestBlockNumber
            : fromBlock + BATCH_SIZE - 1n

          console.log(`[AddressEvents] Fetching logs from block ${fromBlock} to ${toBlock}`)

          try {
            const logs = await publicClient.getLogs({
              address: address,
              fromBlock,
              toBlock,
            })
            allLogs.push(...logs)
          } catch (error) {
            console.error(`[AddressEvents] Error fetching logs for range ${fromBlock}-${toBlock}:`, error)
            // Continue with next batch even if one fails
          }
        }

        console.log(`[AddressEvents] Found ${allLogs.length} total events from eth_getLogs`)

        // Get block timestamps for each event
        const blockNumbers = new Set(allLogs.map((log) => log.blockNumber))
        const blockPromises = Array.from(blockNumbers).map((blockNum) =>
          blockNum ? publicClient.getBlock({ blockNumber: blockNum }) : Promise.resolve(null)
        )

        const blocks = await Promise.all(blockPromises)
        const blockMap = new Map(
          blocks
            .filter((b): b is NonNullable<typeof b> => b !== null)
            .map((b) => [b.number, b.timestamp])
        )

        // Map logs to events with context
        const allEvents: EventWithContext[] = allLogs.map((log) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
          logIndex: log.logIndex!,
          transactionHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: blockMap.get(log.blockNumber!),
        }))

        // Sort by block number descending
        allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber))

        console.log(`[AddressEvents] Loaded ${allEvents.length} events`)
        setEvents(allEvents)
      } catch (error) {
        console.error('[AddressEvents] Error loading events:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [address])

  return { events, loading }
}
