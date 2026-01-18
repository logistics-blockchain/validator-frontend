import { initDb, closeDb } from './db/schema.js'
import { startServer } from './api/server.js'
import { startSync, stopSync } from './indexer/sync.js'
import { startBridgeSync, stopBridgeSync } from './indexer/bridgeSync.js'
import { insertContract } from './db/queries.js'
import { config } from './config.js'

// Known contract ABIs to pre-register
const KNOWN_CONTRACTS: Array<{ address: `0x${string}`; name: string }> = [
  {
    address: '0x0000000000000000000000000000000000009999',
    name: 'DynamicMultiSigValidatorManager',
  },
]

async function main() {
  console.log('Starting Blockchain Indexer...')
  console.log(`RPC URL: ${config.rpcUrl}`)
  console.log(`Database: ${config.dbPath}`)

  // Initialize database
  initDb()

  // Pre-register known contracts (without ABIs - they can be added later)
  for (const contract of KNOWN_CONTRACTS) {
    insertContract({
      address: contract.address,
      name: contract.name,
      abi: null,
      isProxy: false,
      implementation: null,
      addedAt: Date.now(),
    })
  }

  // Start API server
  startServer()

  // Start blockchain sync
  await startSync()

  // Start bridge sync
  await startBridgeSync()

  // Graceful shutdown
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function shutdown() {
  console.log('\nShutting down...')
  stopSync()
  stopBridgeSync()
  closeDb()
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
