import { createPublicClient, http, parseAbiItem } from 'viem'
import { baseSepolia } from 'viem/chains'
import { config } from '../config.js'
import {
  insertBridgePayment,
  getLastBridgeSyncBlock,
  setLastBridgeSyncBlock,
} from '../db/queries.js'
import type { BridgePayment } from '../types.js'

// PaymentRecorded event signature
const paymentRecordedEvent = parseAbiItem(
  'event PaymentRecorded(address indexed besuProxy, uint256 indexed orderId, uint256 amount, address recipient)'
)

// Create Base Sepolia client
const baseClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.baseSepoliaRpcUrl),
})

let syncInterval: ReturnType<typeof setInterval> | null = null
let isSyncing = false

export async function startBridgeSync(): Promise<void> {
  console.log('[BridgeSync] Starting Base Sepolia bridge sync...')
  console.log(`[BridgeSync] RPC: ${config.baseSepoliaRpcUrl}`)
  console.log(`[BridgeSync] Contract: ${config.bridgePaymentReceiver}`)

  // Initial sync
  await syncBridgePayments()

  // Poll for new events
  syncInterval = setInterval(async () => {
    if (!isSyncing) {
      await syncBridgePayments()
    }
  }, config.bridgePollIntervalMs)
}

export function stopBridgeSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('[BridgeSync] Stopped')
  }
}

async function syncBridgePayments(): Promise<void> {
  if (isSyncing) return
  isSyncing = true

  try {
    const latestBlock = await baseClient.getBlockNumber()
    const lastSynced = getLastBridgeSyncBlock()
    const fromBlock = lastSynced >= 0 ? BigInt(lastSynced + 1) : BigInt(config.bridgeSyncFromBlock)

    if (fromBlock > latestBlock) {
      isSyncing = false
      return
    }

    console.log(`[BridgeSync] Syncing blocks ${fromBlock} to ${latestBlock}`)

    // Fetch in chunks to avoid RPC limits
    const CHUNK_SIZE = 10000n
    let currentFrom = fromBlock
    let totalEvents = 0

    while (currentFrom <= latestBlock) {
      const currentTo = currentFrom + CHUNK_SIZE > latestBlock
        ? latestBlock
        : currentFrom + CHUNK_SIZE

      try {
        const logs = await baseClient.getLogs({
          address: config.bridgePaymentReceiver as `0x${string}`,
          event: paymentRecordedEvent,
          fromBlock: currentFrom,
          toBlock: currentTo,
        })

        // Fetch block timestamps for events
        const blockTimestamps = new Map<bigint, bigint>()
        const uniqueBlocks = [...new Set(logs.map(log => log.blockNumber!))]

        for (const blockNum of uniqueBlocks) {
          try {
            const block = await baseClient.getBlock({ blockNumber: blockNum })
            blockTimestamps.set(blockNum, block.timestamp)
          } catch {
            // Ignore timestamp fetch errors
          }
        }

        // Insert events
        for (const log of logs) {
          const payment: BridgePayment = {
            besuProxy: log.args.besuProxy!,
            orderId: log.args.orderId!.toString(),
            amount: log.args.amount!.toString(),
            recipient: log.args.recipient!,
            txHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber!),
            blockTimestamp: blockTimestamps.has(log.blockNumber!)
              ? Number(blockTimestamps.get(log.blockNumber!))
              : null,
            indexedAt: Date.now(),
          }

          try {
            insertBridgePayment(payment)
            totalEvents++
          } catch (err) {
            // Likely duplicate, ignore
          }
        }

        // Update last synced block after each chunk
        setLastBridgeSyncBlock(Number(currentTo))
      } catch (err) {
        console.error(`[BridgeSync] Error fetching blocks ${currentFrom}-${currentTo}:`, err)
      }

      currentFrom = currentTo + 1n
    }

    if (totalEvents > 0) {
      console.log(`[BridgeSync] Indexed ${totalEvents} new payment events`)
    }

    setLastBridgeSyncBlock(Number(latestBlock))
  } catch (err) {
    console.error('[BridgeSync] Sync error:', err)
  } finally {
    isSyncing = false
  }
}

export function getBridgeSyncStatus(): { lastSyncedBlock: number; isSyncing: boolean } {
  return {
    lastSyncedBlock: getLastBridgeSyncBlock(),
    isSyncing,
  }
}
