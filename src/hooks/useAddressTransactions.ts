import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'
import type { TransactionWithMetadata } from '@/types/explorer'
import type { Address } from 'viem'

/**
 * Hook to fetch transactions for a specific address
 * Uses eth_getLogs to efficiently find transactions involving the address
 * Note: This finds transactions TO the address (contract calls)
 * For FROM transactions, we'd need trace API or full node indexing
 */
export function useAddressTransactions(address: Address | null) {
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

          console.log(`[AddressTransactions] Fetching logs from block ${fromBlock} to ${toBlock}`)

          try {
            const logs = await publicClient.getLogs({
              address: address,
              fromBlock,
              toBlock,
            })
            allLogs.push(...logs)
          } catch (error) {
            console.error(`[AddressTransactions] Error fetching logs for range ${fromBlock}-${toBlock}:`, error)
            // Continue with next batch even if one fails
          }
        }

        // Get unique transaction hashes from logs
        const txHashesSet = new Set(allLogs.map((log) => log.transactionHash))
        const txHashes = Array.from(txHashesSet).filter((hash): hash is `0x${string}` => hash !== null)

        console.log(`[AddressTransactions] Found ${txHashes.length} unique transactions from events`)

        // Fetch transaction details in parallel
        const txPromises = txHashes.map(async (hash) => {
          try {
            const [tx, receipt, block] = await Promise.all([
              publicClient.getTransaction({ hash }),
              publicClient.getTransactionReceipt({ hash }).catch(() => null),
              publicClient.getBlock({ blockHash: allLogs.find((l) => l.transactionHash === hash)?.blockHash! }),
            ])

            const from = tx.from.toLowerCase()
            const to = tx.to?.toLowerCase()
            const targetAddr = address.toLowerCase()

            let direction: TransactionWithMetadata['direction']

            if (!to) {
              direction = from === targetAddr ? 'create' : undefined
            } else if (from === targetAddr && to === targetAddr) {
              direction = 'self'
            } else if (from === targetAddr) {
              direction = 'out'
            } else if (to === targetAddr) {
              direction = 'in'
            }

            // If no direction, this tx doesn't directly involve the address (just emitted events)
            // Still include it since the address was involved
            if (!direction) {
              direction = 'in' // Default to 'in' for contract event emissions
            }

            return {
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
            }
          } catch (error) {
            console.error('[AddressTransactions] Error fetching tx', hash, error)
            return null
          }
        })

        const txsResults = await Promise.all(txPromises)
        const txs = txsResults.filter((tx): tx is TransactionWithMetadata => tx !== null)

        // Sort by block number descending
        txs.sort((a, b) => Number(b.blockNumber - a.blockNumber))

        console.log(`[AddressTransactions] Loaded ${txs.length} transactions`)
        setTransactions(txs)
      } catch (error) {
        console.error('[AddressTransactions] Error loading transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [address])

  return { transactions, loading }
}
