import type { Address, Hash } from 'viem'

export interface BesuOrderCreatedEvent {
  orderId: bigint
  proxyAddress: Address
  manufacturer: Address
  receiver: Address
  ipfsHash: string
  txHash: Hash
  blockNumber: bigint
  timestamp: bigint | null
}

export interface BasePaymentEvent {
  besuProxy: Address
  orderId: bigint
  amount: bigint
  recipient: Address
  txHash: Hash
  blockNumber: bigint
}

export interface CrossChainTransaction {
  compositeKey: string // `${proxyAddress}-${orderId}`
  besuProxyAddress: Address
  orderId: bigint
  besuEvent: BesuOrderCreatedEvent | null
  baseEvent: BasePaymentEvent | null
  status: 'pending' | 'completed' | 'failed'
}

export interface BridgeStats {
  totalOrders: number
  completedBridges: number
  pendingBridges: number
  lastActivity: Date | null
}

export interface ChainStatus {
  chainId: number
  name: string
  connected: boolean
  latestBlock: bigint | null
  error: string | null
}

export const BRIDGE_CONFIG = {
  besu: {
    chainId: 10002,
    name: 'Besu Cloud',
    rpcUrl: '/api/rpc',
  },
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: '/api/base-rpc',
    explorerUrl: 'https://sepolia.basescan.org',
    paymentReceiver: '0x5443266088527cdd602d2db405dc5596aa40278b' as Address,
  },
} as const
