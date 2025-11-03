import type { Block, Log, Hash, Address } from 'viem'

export type { Block, Log, Hash, Address }

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
