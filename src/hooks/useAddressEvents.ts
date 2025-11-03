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
 * Scans recent blocks to find events
 */
export function useAddressEvents(address: Address | null, maxBlocks: number = 50) {
  const [events, setEvents] = useState<EventWithContext[]>([])
  const [loading, setLoading] = useState(false)
  const currentBlock = useBlockchainStore((state) => state.currentBlock)

  useEffect(() => {
    if (!address) {
      setEvents([])
      return
    }

    const loadEvents = async () => {
      setLoading(true)
      try {
        // Get latest block number
        let latestBlockNumber: bigint
        if (!currentBlock) {
          latestBlockNumber = await publicClient.getBlockNumber()
        } else {
          latestBlockNumber = currentBlock.number
        }

        // Calculate range
        const startBlock = latestBlockNumber > BigInt(maxBlocks)
          ? latestBlockNumber - BigInt(maxBlocks) + 1n
          : 1n

        console.log(
          '[AddressEvents] Scanning blocks from',
          startBlock,
          'to',
          latestBlockNumber,
          'for contract',
          address
        )

        const allEvents: EventWithContext[] = []

        // Scan blocks for events
        for (let blockNum = latestBlockNumber; blockNum >= startBlock; blockNum--) {
          const block = await publicClient.getBlock({
            blockNumber: blockNum,
            includeTransactions: true,
          })

          // Get all transaction hashes in this block
          const txHashes = block.transactions.map((tx) =>
            typeof tx === 'string' ? tx : tx.hash
          )

          // Fetch receipts for all transactions
          const receipts = await Promise.all(
            txHashes.map((hash) =>
              publicClient.getTransactionReceipt({ hash }).catch(() => null)
            )
          )

          // Extract logs from receipts
          for (const receipt of receipts) {
            if (!receipt) continue

            for (const log of receipt.logs) {
              // Filter logs emitted by this address
              if (log.address.toLowerCase() === address.toLowerCase()) {
                allEvents.push({
                  address: log.address,
                  topics: log.topics,
                  data: log.data,
                  logIndex: log.logIndex!,
                  transactionHash: log.transactionHash!,
                  blockNumber: log.blockNumber!,
                  timestamp: block.timestamp,
                })
              }
            }
          }
        }

        console.log(`[AddressEvents] Found ${allEvents.length} events for contract`)
        setEvents(allEvents)
      } catch (error) {
        console.error('[AddressEvents] Error loading events:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [address, currentBlock, maxBlocks])

  return { events, loading }
}
