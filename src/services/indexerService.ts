import type { Address, Hash, Hex } from 'viem'

// Use Vite proxy in dev and Vercel API proxy in production
// Both proxy /api/indexer to the actual indexer service
const INDEXER_API_URL = ''
const API_PREFIX = '/api/indexer'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total?: number
    limit: number
    offset: number
  }
}

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

export interface ValidatorStat {
  miner: Address
  blockCount: number
  percentage: number
}

export interface ChainStats {
  totalBlocks: number
  totalTransactions: number
  totalEvents: number
  totalContracts: number
  syncStatus: string
  lastIndexedBlock: number
}

export interface BridgePayment {
  besuProxy: Address
  orderId: string
  amount: string
  recipient: Address
  txHash: Hash
  blockNumber: number
  blockTimestamp: number
  indexedAt: number
}

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
  // endpoint comes in as /api/... so we need to strip /api and add our prefix
  const path = endpoint.replace(/^\/api/, '')
  const response = await fetch(`${INDEXER_API_URL}${API_PREFIX}${path}`)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }
  return response.json()
}

export const indexerService = {
  async getHealth(): Promise<{ status: string; lastIndexedBlock: number; timestamp: number }> {
    const res = await fetchApi<{ status: string; lastIndexedBlock: number; timestamp: number }>('/api/health')
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch health')
    return res.data
  },

  async getStats(): Promise<ChainStats> {
    const res = await fetchApi<ChainStats>('/api/stats')
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch stats')
    return res.data
  },

  async getValidatorStats(): Promise<ValidatorStat[]> {
    const res = await fetchApi<ValidatorStat[]>('/api/stats/validators')
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch validator stats')
    return res.data
  },

  async getBlocks(limit = 20, offset = 0): Promise<{ blocks: IndexedBlock[]; total: number }> {
    const res = await fetchApi<IndexedBlock[]>(`/api/blocks?limit=${limit}&offset=${offset}`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch blocks')
    return { blocks: res.data, total: res.meta?.total || res.data.length }
  },

  async getBlock(blockNumber: number): Promise<IndexedBlock | null> {
    try {
      const res = await fetchApi<IndexedBlock>(`/api/blocks/${blockNumber}`)
      if (!res.success || !res.data) return null
      return res.data
    } catch {
      return null
    }
  },

  async getBlockTransactions(blockNumber: number): Promise<IndexedTransaction[]> {
    const res = await fetchApi<IndexedTransaction[]>(`/api/blocks/${blockNumber}/transactions`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch block transactions')
    return res.data
  },

  async getTransactions(limit = 20, offset = 0): Promise<{ transactions: IndexedTransaction[]; total: number }> {
    const res = await fetchApi<IndexedTransaction[]>(`/api/transactions?limit=${limit}&offset=${offset}`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch transactions')
    return { transactions: res.data, total: res.meta?.total || res.data.length }
  },

  async getTransaction(hash: Hash): Promise<{ transaction: IndexedTransaction; events: IndexedEvent[] } | null> {
    try {
      const res = await fetchApi<{ transaction: IndexedTransaction; events: IndexedEvent[] }>(`/api/transactions/${hash}`)
      if (!res.success || !res.data) return null
      return res.data
    } catch {
      return null
    }
  },

  async getAddressTransactions(
    address: Address,
    limit = 50,
    offset = 0,
    direction: 'in' | 'out' | 'all' = 'all'
  ): Promise<IndexedTransaction[]> {
    const res = await fetchApi<IndexedTransaction[]>(
      `/api/address/${address}/transactions?limit=${limit}&offset=${offset}&direction=${direction}`
    )
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch address transactions')
    return res.data
  },

  async getAddressEvents(address: Address, limit = 50, offset = 0): Promise<IndexedEvent[]> {
    const res = await fetchApi<IndexedEvent[]>(`/api/address/${address}/events?limit=${limit}&offset=${offset}`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch address events')
    return res.data
  },

  async getAddressEventsDecoded(
    address: Address,
    limit = 50,
    offset = 0
  ): Promise<Array<IndexedEvent & { decoded?: DecodedEvent }>> {
    const res = await fetchApi<Array<IndexedEvent & { decoded?: DecodedEvent }>>(
      `/api/address/${address}/events/decoded?limit=${limit}&offset=${offset}`
    )
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch decoded events')
    return res.data
  },

  async getEventsByTopic(topic0: Hash, limit = 50, offset = 0): Promise<IndexedEvent[]> {
    const res = await fetchApi<IndexedEvent[]>(`/api/events?topic0=${topic0}&limit=${limit}&offset=${offset}`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch events by topic')
    return res.data
  },

  async registerContract(address: Address, name: string, abi: unknown[]): Promise<void> {
    const response = await fetch(`${INDEXER_API_URL}${API_PREFIX}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, name, abi }),
    })
    const res = await response.json()
    if (!res.success) throw new Error(res.error || 'Failed to register contract')
  },

  async decodeContractEvents(address: Address): Promise<number> {
    const response = await fetch(`${INDEXER_API_URL}${API_PREFIX}/contracts/${address}/decode`, {
      method: 'POST',
    })
    const res = await response.json()
    if (!res.success) throw new Error(res.error || 'Failed to decode events')
    return res.data?.decodedCount || 0
  },

  async getBridgePayments(limit = 100, offset = 0): Promise<{ payments: BridgePayment[]; total: number }> {
    const res = await fetchApi<BridgePayment[]>(`/api/bridge/payments?limit=${limit}&offset=${offset}`)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch bridge payments')
    return { payments: res.data, total: res.meta?.total || res.data.length }
  },

  isAvailable: async (): Promise<boolean> => {
    try {
      await indexerService.getHealth()
      return true
    } catch {
      return false
    }
  },
}
