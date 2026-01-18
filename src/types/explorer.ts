import type { Address, Hash } from 'viem'

/**
 * Block information for explorer (gasless chain)
 */
export interface BlockInfo {
  number: bigint
  hash: Hash
  parentHash: Hash
  timestamp: bigint
  miner: Address
  transactionCount: number
  size: bigint
  transactions: Hash[]
}

/**
 * Transaction information for explorer (gasless chain)
 */
export interface TransactionInfo {
  hash: Hash
  blockNumber: bigint
  blockHash: Hash
  from: Address
  to: Address | null
  value: bigint
  input: string
  nonce: number
  transactionIndex: number
  timestamp?: bigint
  status?: 'success' | 'reverted'
}

/**
 * Transaction receipt information
 */
export interface TransactionReceipt {
  transactionHash: Hash
  blockNumber: bigint
  blockHash: Hash
  from: Address
  to: Address | null
  contractAddress: Address | null
  status: 'success' | 'reverted'
  logs: TransactionLog[]
}

/**
 * Transaction log/event
 */
export interface TransactionLog {
  address: Address
  topics: Hash[]
  data: string
  logIndex: number
  transactionHash: Hash
  blockNumber: bigint
}

/**
 * Address information
 */
export interface AddressInfo {
  address: Address
  balance: bigint
  transactionCount: number
  isContract: boolean
  code?: string
  contractName?: string
  isProxy?: boolean
  proxyType?: string
  implementation?: Address
}

/**
 * Transaction with additional metadata for display
 */
export interface TransactionWithMetadata extends TransactionInfo {
  direction?: 'in' | 'out' | 'self' | 'create'
  methodName?: string
}
