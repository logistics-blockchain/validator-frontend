import { getBlock, getTransactionReceipt } from './client.js'
import {
  insertBlock,
  insertTransaction,
  insertEvent,
  setLastIndexedBlock,
  getContract,
} from '../db/queries.js'
import { decodeEventIfPossible } from './decoder.js'
import type { IndexedBlock, IndexedTransaction, IndexedEvent } from '../types.js'
import type { Address, Hash, Hex } from 'viem'

export async function processBlock(blockNumber: bigint): Promise<void> {
  const now = Date.now()

  // Fetch block with transactions
  const block = await getBlock(blockNumber)
  if (!block) {
    throw new Error(`Block ${blockNumber} not found`)
  }

  // Insert block
  const indexedBlock: IndexedBlock = {
    number: Number(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: Number(block.timestamp),
    miner: block.miner as Address,
    transactionCount: block.transactions.length,
    size: Number(block.size),
    indexedAt: now,
  }
  insertBlock(indexedBlock)

  // Process transactions
  for (const tx of block.transactions) {
    if (typeof tx === 'string') continue // Skip if only hash

    // Get receipt for status and logs
    const receipt = await getTransactionReceipt(tx.hash)

    const indexedTx: IndexedTransaction = {
      hash: tx.hash,
      blockNumber: Number(block.number),
      blockHash: block.hash,
      txIndex: tx.transactionIndex ?? 0,
      fromAddress: tx.from as Address,
      toAddress: (tx.to as Address) || null,
      value: tx.value.toString(),
      input: tx.input as Hex,
      nonce: tx.nonce,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      contractCreated: (receipt.contractAddress as Address) || null,
      indexedAt: now,
    }
    insertTransaction(indexedTx)

    // Process logs/events
    for (const log of receipt.logs) {
      const indexedEvent: IndexedEvent = {
        txHash: tx.hash,
        logIndex: log.logIndex ?? 0,
        blockNumber: Number(block.number),
        address: log.address as Address,
        topic0: (log.topics[0] as Hash) || null,
        topic1: (log.topics[1] as Hash) || null,
        topic2: (log.topics[2] as Hash) || null,
        topic3: (log.topics[3] as Hash) || null,
        data: log.data as Hex,
        indexedAt: now,
      }
      const eventId = insertEvent(indexedEvent)

      // Try to decode if we have ABI for this contract
      const contract = getContract(log.address)
      if (contract?.abi) {
        await decodeEventIfPossible(eventId, indexedEvent, contract.abi)
      }
    }
  }

  // Update last indexed block
  setLastIndexedBlock(Number(blockNumber))
}

export async function processBlockRange(
  fromBlock: bigint,
  toBlock: bigint,
  onProgress?: (current: bigint, total: bigint) => void
): Promise<void> {
  const total = toBlock - fromBlock + 1n
  const BATCH_SIZE = 50 // Process 50 blocks in parallel

  for (let batchStart = fromBlock; batchStart <= toBlock; batchStart += BigInt(BATCH_SIZE)) {
    const batchEnd = batchStart + BigInt(BATCH_SIZE) - 1n > toBlock
      ? toBlock
      : batchStart + BigInt(BATCH_SIZE) - 1n

    // Process batch in parallel
    const blockPromises: Promise<void>[] = []
    for (let blockNum = batchStart; blockNum <= batchEnd; blockNum++) {
      blockPromises.push(processBlock(blockNum))
    }

    await Promise.all(blockPromises)

    if (onProgress) {
      onProgress(batchEnd - fromBlock + 1n, total)
    }
  }
}
