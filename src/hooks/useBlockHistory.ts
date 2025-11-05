import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'
import type { BlockInfo, TransactionInfo, TransactionReceipt } from '@/types/explorer'
import type { Hash } from 'viem'

/**
 * Hook to fetch and manage block history
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

    // Add only the new block incrementally
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
      // Get latest block number (currentBlock is a Block object, not a bigint)
      let latestBlockNumber: bigint
      if (!currentBlock) {
        console.log('[BlockExplorer] Fetching latest block number...')
        latestBlockNumber = await publicClient.getBlockNumber()
        console.log('[BlockExplorer] Latest block:', latestBlockNumber)
      } else {
        // Extract block number from Block object
        latestBlockNumber = currentBlock.number
        console.log('[BlockExplorer] Using currentBlock number:', latestBlockNumber)
      }

      const blockNumbers: bigint[] = []
      // Start from block 1 (skip genesis block 0) or calculate based on count
      const start = latestBlockNumber > BigInt(count - 1) ? latestBlockNumber - BigInt(count - 1) : 1n

      for (let i = latestBlockNumber; i >= start && i >= 1n; i--) {
        blockNumbers.push(i)
      }

      console.log('[BlockExplorer] Initial load: Fetching blocks from', start, 'to', latestBlockNumber, '- total:', blockNumbers.length)

      const blockPromises = blockNumbers.map(async (num) => {
        const block = await publicClient.getBlock({ blockNumber: num })
        return {
          number: block.number!,
          hash: block.hash!,
          parentHash: block.parentHash,
          timestamp: block.timestamp,
          miner: block.miner!,
          transactionCount: block.transactions.length,
          size: block.size,
          transactions: block.transactions as Hash[],
        } as BlockInfo
      })

      const loadedBlocks = await Promise.all(blockPromises)
      console.log('[BlockExplorer] Initial load complete:', loadedBlocks.length, 'blocks')
      setBlocks(loadedBlocks)
      setLastBlockNumber(latestBlockNumber)
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
 * Hook to fetch a single block by number
 */
export function useBlock(blockNumber: bigint | null) {
  const [block, setBlock] = useState<BlockInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (blockNumber === null) return

    const loadBlock = async () => {
      setLoading(true)
      try {
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
 * Hook to fetch transaction details
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
