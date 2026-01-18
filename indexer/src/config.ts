import 'dotenv/config'

export const config = {
  rpcUrl: process.env.RPC_URL || 'http://130.61.22.253:8545',
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || './data/indexer.db',
  syncFromBlock: parseInt(process.env.SYNC_FROM_BLOCK || '0', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  // Base Sepolia bridge sync config
  baseSepoliaRpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  bridgePaymentReceiver: process.env.BRIDGE_PAYMENT_RECEIVER || '0x5443266088527cdd602d2db405dc5596aa40278b',
  bridgeSyncFromBlock: parseInt(process.env.BRIDGE_SYNC_FROM_BLOCK || '20000000', 10), // ~Dec 2025
  bridgePollIntervalMs: parseInt(process.env.BRIDGE_POLL_INTERVAL_MS || '30000', 10),
}
