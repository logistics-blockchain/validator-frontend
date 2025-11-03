import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'
import type { TransactionWithMetadata } from '@/types/explorer'
import type { Address } from 'viem'

/**
 * Hook to fetch transactions for a specific address
 * Scans recent blocks to find transactions involving the address
 */
export function useAddressTransactions(address: Address | null, maxBlocks: number = 50) {
  const [transactions, setTransactions] = useState<TransactionWithMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const currentBlock = useBlockchainStore((state) => state.currentBlock)

  useEffect(() => {
    if (!address) {
      setTransactions([])
      return
    }

    const loadTransactions = async () => {
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
          '[AddressTransactions] Scanning blocks from',
          startBlock,
          'to',
          latestBlockNumber,
          'for address',
          address
        )

        const txs: TransactionWithMetadata[] = []

        // Scan blocks for transactions
        for (let blockNum = latestBlockNumber; blockNum >= startBlock; blockNum--) {
          const block = await publicClient.getBlock({
            blockNumber: blockNum,
            includeTransactions: true,
          })

          // Filter transactions involving this address
          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue // Skip if only hash

            const from = tx.from.toLowerCase()
            const to = tx.to?.toLowerCase()
            const targetAddr = address.toLowerCase()

            let direction: TransactionWithMetadata['direction']

            if (!to) {
              // Contract creation
              direction = from === targetAddr ? 'create' : undefined
            } else if (from === targetAddr && to === targetAddr) {
              direction = 'self'
            } else if (from === targetAddr) {
              direction = 'out'
            } else if (to === targetAddr) {
              direction = 'in'
            }

            if (direction) {
              // Get receipt for status
              const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash }).catch(() => null)

              txs.push({
                hash: tx.hash,
                blockNumber: tx.blockNumber!,
                blockHash: tx.blockHash!,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                input: tx.input,
                nonce: tx.nonce,
                transactionIndex: tx.transactionIndex!,
                timestamp: block.timestamp,
                status: receipt?.status === 'success' ? 'success' : 'reverted',
                direction,
              })
            }
          }
        }

        console.log(`[AddressTransactions] Found ${txs.length} transactions for address`)
        setTransactions(txs)
      } catch (error) {
        console.error('[AddressTransactions] Error loading transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [address, currentBlock, maxBlocks])

  return { transactions, loading }
}
