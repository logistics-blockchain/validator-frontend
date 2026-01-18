import type { Block, Log, Hash, Address, Hex } from 'viem'

// Re-export viem types for convenience
export type { Block, Log, Hash, Address, Hex }

export interface IndexedBlock {
  number: number
  hash: Hash
  parentHash: Hash
  timestamp: number
  miner: Address
  transactionCount: number
  size: number
  indexedAt: number
}

export interface IndexedTransaction {
  hash: Hash
  blockNumber: number
  blockHash: Hash
  txIndex: number
  fromAddress: Address
  toAddress: Address | null
  value: string
  input: Hex
  nonce: number
  status: 'success' | 'reverted'
  contractCreated: Address | null
  indexedAt: number
}

export interface IndexedEvent {
  id?: number
  txHash: Hash
  logIndex: number
  blockNumber: number
  address: Address
  topic0: Hash | null
  topic1: Hash | null
  topic2: Hash | null
  topic3: Hash | null
  data: Hex
  indexedAt: number
}

export interface DecodedEvent {
  eventId: number
  eventName: string
  args: string
  decodedAt: number
}

export interface TransactionInfo {
  hash: Hash
  from: Address
  to: Address | null
  value: bigint
  blockNumber: bigint
  timestamp: bigint
  status: 'pending' | 'success' | 'failed'
  functionName?: string
  args?: unknown[]
}

export interface EventInfo {
  address: Address
  eventName: string
  args: Record<string, unknown>
  blockNumber: bigint
  transactionHash: Hash
  timestamp: bigint
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total?: number
    limit: number
    offset: number
  }
}
