import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { indexerService } from '@/services/indexerService'
import { useBlockchainStore } from '@/store/blockchainStore'
import type { BlockInfo, TransactionInfo, TransactionReceipt } from '@/types/explorer'
import type { Hash } from 'viem'

/**
 * Hook to fetch and manage block history using the indexer API
 */
export function useBlockHistory(count: number = 20) {
  const [blocks, setBlocks] = useState<BlockInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [lastBlockNumber, setLastBlockNumber] = useState<bigint | null>(null)
  const currentBlock = useBlockchainStore((state) => state.currentBlock)

  // Initial load only
  useEffect(() => {
    loadBlocks()
  }, [count])

  // Incremental update when new block arrives
  useEffect(() => {
    if (!currentBlock) return

    const blockNum = currentBlock.number

    // Skip if we already have this block
    if (lastBlockNumber !== null && blockNum <= lastBlockNumber) {
      return
    }

    // If this is first load or initial blocks not loaded yet
    if (blocks.length === 0) {
      loadBlocks()
      return
    }

    // Add only the new block incrementally (use RPC for real-time updates)
    addNewBlock(blockNum)
  }, [currentBlock])

  const addNewBlock = async (blockNumber: bigint) => {
    try {
      console.log('[BlockExplorer] Adding new block:', blockNumber)
      const block = await publicClient.getBlock({ blockNumber })

      const newBlock: BlockInfo = {
        number: block.number!,
        hash: block.hash!,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        miner: block.miner!,
        transactionCount: block.transactions.length,
        size: block.size,
        transactions: block.transactions as Hash[],
      }

      // Prepend new block and keep only 'count' most recent blocks
      setBlocks((prev) => [newBlock, ...prev].slice(0, count))
      setLastBlockNumber(blockNumber)
    } catch (error) {
      console.error('[BlockExplorer] Error adding new block:', error)
    }
  }

  const loadBlocks = async () => {
    setLoading(true)
    try {
      console.log('[BlockExplorer] Loading blocks from indexer...')

      const { blocks: indexedBlocks } = await indexerService.getBlocks(count, 0)

      const loadedBlocks: BlockInfo[] = indexedBlocks.map((block) => ({
        number: BigInt(block.number),
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: BigInt(block.timestamp),
        miner: block.miner,
        transactionCount: block.transactionCount,
        size: BigInt(block.size),
        transactions: [], // Not included in batch response
      }))

      console.log('[BlockExplorer] Loaded', loadedBlocks.length, 'blocks from indexer')
      setBlocks(loadedBlocks)
      if (loadedBlocks.length > 0) {
        setLastBlockNumber(loadedBlocks[0].number)
      }
    } catch (error) {
      console.error('[BlockExplorer] Error loading blocks:', error)
      setBlocks([])
    } finally {
      setLoading(false)
    }
  }

  return { blocks, loading, refresh: loadBlocks }
}

/**
 * Hook to fetch a single block by number using indexer API
 */
export function useBlock(blockNumber: bigint | null) {
  const [block, setBlock] = useState<BlockInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (blockNumber === null) return

    const loadBlock = async () => {
      setLoading(true)
      try {
        const indexedBlock = await indexerService.getBlock(Number(blockNumber))

        if (indexedBlock) {
          setBlock({
            number: BigInt(indexedBlock.number),
            hash: indexedBlock.hash,
            parentHash: indexedBlock.parentHash,
            timestamp: BigInt(indexedBlock.timestamp),
            miner: indexedBlock.miner,
            transactionCount: indexedBlock.transactionCount,
            size: BigInt(indexedBlock.size),
            transactions: [],
          })
        } else {
          // Fallback to RPC if block not in indexer yet
          const blockData = await publicClient.getBlock({ blockNumber })
          setBlock({
            number: blockData.number!,
            hash: blockData.hash!,
            parentHash: blockData.parentHash,
            timestamp: blockData.timestamp,
            miner: blockData.miner!,
            transactionCount: blockData.transactions.length,
            size: blockData.size,
            transactions: blockData.transactions as Hash[],
          })
        }
      } catch (error) {
        console.error('Error loading block:', error)
        setBlock(null)
      } finally {
        setLoading(false)
      }
    }

    loadBlock()
  }, [blockNumber])

  return { block, loading }
}

/**
 * Hook to fetch transaction details using indexer API
 */
export function useTransaction(txHash: Hash | null) {
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null)
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!txHash) return

    const loadTransaction = async () => {
      setLoading(true)
      try {
        const result = await indexerService.getTransaction(txHash)

        if (result) {
          const { transaction: tx, events } = result

          setTransaction({
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
          })

          setReceipt({
            transactionHash: tx.hash,
            blockNumber: BigInt(tx.blockNumber),
            blockHash: tx.blockHash,
            from: tx.fromAddress,
            to: tx.toAddress,
            contractAddress: tx.contractCreated,
            status: tx.status,
            logs: events.map((event) => ({
              address: event.address,
              topics: [event.topic0, event.topic1, event.topic2, event.topic3].filter(
                (t): t is Hash => t !== null
              ),
              data: event.data,
              logIndex: event.logIndex,
              transactionHash: event.txHash,
              blockNumber: BigInt(event.blockNumber),
            })),
          })
        } else {
          // Fallback to RPC if not indexed yet
          const [tx, rcpt] = await Promise.all([
            publicClient.getTransaction({ hash: txHash }),
            publicClient.getTransactionReceipt({ hash: txHash }).catch(() => null),
          ])

          setTransaction({
            hash: tx.hash,
            blockNumber: tx.blockNumber!,
            blockHash: tx.blockHash!,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            input: tx.input,
            nonce: tx.nonce,
            transactionIndex: tx.transactionIndex!,
            status: rcpt?.status === 'success' ? 'success' : 'reverted',
          })

          if (rcpt) {
            setReceipt({
              transactionHash: rcpt.transactionHash,
              blockNumber: rcpt.blockNumber,
              blockHash: rcpt.blockHash,
              from: rcpt.from,
              to: rcpt.to,
              contractAddress: rcpt.contractAddress,
              status: rcpt.status,
              logs: rcpt.logs.map((log) => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                logIndex: log.logIndex!,
                transactionHash: log.transactionHash!,
                blockNumber: log.blockNumber!,
              })),
            })
          }
        }
      } catch (error) {
        console.error('Error loading transaction:', error)
        setTransaction(null)
        setReceipt(null)
      } finally {
        setLoading(false)
      }
    }

    loadTransaction()
  }, [txHash])

  return { transaction, receipt, loading }
}
