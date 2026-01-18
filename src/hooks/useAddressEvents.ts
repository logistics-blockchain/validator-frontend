import { useEffect, useState } from 'react'
import { indexerService } from '@/services/indexerService'
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
 * Uses the blockchain indexer API for efficient querying
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

        const indexedEvents = await indexerService.getAddressEvents(address, 100, 0)

        // Get unique block numbers to fetch timestamps
        const uniqueBlockNumbers = [...new Set(indexedEvents.map((e) => e.blockNumber))]
        const blockTimestamps = new Map<number, number>()

        // Fetch block timestamps sequentially to avoid rate limiting
        for (const blockNum of uniqueBlockNumbers.slice(0, 50)) {
          try {
            const block = await indexerService.getBlock(blockNum)
            if (block) blockTimestamps.set(blockNum, block.timestamp)
          } catch {
            // Ignore errors for individual block fetches
          }
        }

        const allEvents: EventWithContext[] = indexedEvents.map((event) => {
          const timestamp = blockTimestamps.get(event.blockNumber)
          return {
            address: event.address,
            topics: [event.topic0, event.topic1, event.topic2, event.topic3].filter(
              (t): t is Hash => t !== null
            ),
            data: event.data,
            logIndex: event.logIndex,
            transactionHash: event.txHash,
            blockNumber: BigInt(event.blockNumber),
            timestamp: timestamp ? BigInt(timestamp) : undefined,
          }
        })

        console.log(`[AddressEvents] Loaded ${allEvents.length} events from indexer`)
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
