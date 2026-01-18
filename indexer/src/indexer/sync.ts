import { getCurrentBlockNumber } from './client.js'
import { processBlock, processBlockRange } from './blockProcessor.js'
import { getLastIndexedBlock, setState } from '../db/queries.js'
import { config } from '../config.js'

let syncInterval: NodeJS.Timeout | null = null
let isSyncing = false

export async function startSync(): Promise<void> {
  if (isSyncing) {
    console.log('Sync already in progress')
    return
  }

  isSyncing = true
  setState('sync_status', 'syncing')

  try {
    // Get current chain head
    const currentBlock = await getCurrentBlockNumber()
    const lastIndexed = getLastIndexedBlock()
    const startBlock = Math.max(lastIndexed + 1, config.syncFromBlock)

    console.log(`Chain head: ${currentBlock}, Last indexed: ${lastIndexed}`)

    if (BigInt(startBlock) <= currentBlock) {
      const blocksToSync = Number(currentBlock) - startBlock + 1
      console.log(`Syncing ${blocksToSync} blocks (${startBlock} to ${currentBlock})...`)

      await processBlockRange(BigInt(startBlock), currentBlock, (current, total) => {
        if (current % 100n === 0n || current === total) {
          const percent = ((Number(current) / Number(total)) * 100).toFixed(1)
          console.log(`Sync progress: ${current}/${total} (${percent}%)`)
        }
      })

      console.log('Initial sync complete')
    } else {
      console.log('Already synced to chain head')
    }

    // Start real-time sync
    setState('sync_status', 'realtime')
    startRealtimeSync()
  } catch (error) {
    console.error('Sync error:', error)
    setState('sync_status', 'idle')
  } finally {
    isSyncing = false
  }
}

function startRealtimeSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
  }

  console.log(`Starting real-time sync (polling every ${config.pollIntervalMs}ms)`)

  syncInterval = setInterval(async () => {
    try {
      const currentBlock = await getCurrentBlockNumber()
      const lastIndexed = getLastIndexedBlock()

      if (BigInt(lastIndexed) < currentBlock) {
        const blocksToProcess = Number(currentBlock) - lastIndexed
        console.log(`New blocks detected: ${blocksToProcess} (${lastIndexed + 1} to ${currentBlock})`)

        for (let i = lastIndexed + 1; i <= Number(currentBlock); i++) {
          await processBlock(BigInt(i))
        }
      }
    } catch (error) {
      console.error('Realtime sync error:', error)
    }
  }, config.pollIntervalMs)
}

export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  isSyncing = false
  setState('sync_status', 'idle')
  console.log('Sync stopped')
}

export function getSyncStatus(): { status: string; lastIndexedBlock: number } {
  return {
    status: isSyncing ? 'syncing' : syncInterval ? 'realtime' : 'idle',
    lastIndexedBlock: getLastIndexedBlock(),
  }
}
