import type { Address, Hash, Hex } from 'viem'

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

export interface ContractABI {
  address: Address
  name: string | null
  abi: string | null
  isProxy: boolean
  implementation: Address | null
  addedAt: number
}

export interface IndexerState {
  lastIndexedBlock: number
  syncStatus: 'idle' | 'syncing' | 'realtime'
  startedAt: number
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

export interface BridgePayment {
  id?: number
  besuProxy: Address
  orderId: string
  amount: string
  recipient: Address
  txHash: Hash
  blockNumber: number
  blockTimestamp: number | null
  indexedAt: number
}
