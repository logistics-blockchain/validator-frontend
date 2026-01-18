import { useEffect, useState } from 'react'
import { indexerService } from '@/services/indexerService'
import type { TransactionWithMetadata } from '@/types/explorer'
import type { Address } from 'viem'

/**
 * Hook to fetch transactions for a specific address
 * Uses the blockchain indexer API for efficient querying
 */
export function useAddressTransactions(address: Address | null, direction: 'in' | 'out' | 'all' = 'all') {
  const [transactions, setTransactions] = useState<TransactionWithMetadata[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setTransactions([])
      return
    }

    const loadTransactions = async () => {
      setLoading(true)
      try {
        console.log('[AddressTransactions] Fetching transactions for', address)

        const indexedTxs = await indexerService.getAddressTransactions(address, 100, 0, direction)

        // Get unique block numbers to fetch timestamps (limit to 10 most recent to avoid rate limits)
        const uniqueBlockNumbers = [...new Set(indexedTxs.map((tx) => tx.blockNumber))]
          .sort((a, b) => b - a)
          .slice(0, 10)
        const blockTimestamps = new Map<number, number>()

        // Fetch block timestamps with delay to avoid rate limiting
        for (const blockNum of uniqueBlockNumbers) {
          try {
            const block = await indexerService.getBlock(blockNum)
            if (block) blockTimestamps.set(blockNum, block.timestamp)
            // Small delay between requests
            await new Promise((r) => setTimeout(r, 100))
          } catch {
            // Ignore errors for individual block fetches
          }
        }

        const txs: TransactionWithMetadata[] = indexedTxs.map((tx) => {
          const from = tx.fromAddress.toLowerCase()
          const to = tx.toAddress?.toLowerCase()
          const targetAddr = address.toLowerCase()

          let txDirection: TransactionWithMetadata['direction']

          if (!to) {
            txDirection = from === targetAddr ? 'create' : undefined
          } else if (from === targetAddr && to === targetAddr) {
            txDirection = 'self'
          } else if (from === targetAddr) {
            txDirection = 'out'
          } else if (to === targetAddr) {
            txDirection = 'in'
          }

          if (!txDirection) {
            txDirection = 'in'
          }

          const timestamp = blockTimestamps.get(tx.blockNumber)

          return {
            hash: tx.hash,
            blockNumber: BigInt(tx.blockNumber),
            blockHash: tx.blockHash,
            from: tx.fromAddress,
            to: tx.toAddress,
            value: BigInt(tx.value),
            input: tx.input,
            nonce: tx.nonce,
            transactionIndex: tx.txIndex,
            status: tx.status,
            direction: txDirection,
            timestamp: timestamp ? BigInt(timestamp) : undefined,
          }
        })

        console.log(`[AddressTransactions] Loaded ${txs.length} transactions from indexer`)
        setTransactions(txs)
      } catch (error) {
        console.error('[AddressTransactions] Error loading transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [address, direction])

  return { transactions, loading }
}
