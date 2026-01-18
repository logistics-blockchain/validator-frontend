import { getDb } from './schema.js'
import type {
  IndexedBlock,
  IndexedTransaction,
  IndexedEvent,
  ContractABI,
  DecodedEvent,
} from '../types.js'

// ============ State ============

export function getState(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM indexer_state WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setState(key: string, value: string): void {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO indexer_state (key, value) VALUES (?, ?)').run(key, value)
}

export function getLastIndexedBlock(): number {
  const value = getState('last_indexed_block')
  return value ? parseInt(value, 10) : -1
}

export function setLastIndexedBlock(blockNumber: number): void {
  setState('last_indexed_block', blockNumber.toString())
}

// ============ Blocks ============

export function insertBlock(block: IndexedBlock): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO blocks
    (number, hash, parent_hash, timestamp, miner, transaction_count, size, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    block.number,
    block.hash,
    block.parentHash,
    block.timestamp,
    block.miner,
    block.transactionCount,
    block.size,
    block.indexedAt
  )
}

export function getBlock(number: number): IndexedBlock | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM blocks WHERE number = ?').get(number) as any
  if (!row) return null
  return {
    number: row.number,
    hash: row.hash,
    parentHash: row.parent_hash,
    timestamp: row.timestamp,
    miner: row.miner,
    transactionCount: row.transaction_count,
    size: row.size,
    indexedAt: row.indexed_at,
  }
}

export function getBlocks(limit: number, offset: number): IndexedBlock[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM blocks ORDER BY number DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[]
  return rows.map((row) => ({
    number: row.number,
    hash: row.hash,
    parentHash: row.parent_hash,
    timestamp: row.timestamp,
    miner: row.miner,
    transactionCount: row.transaction_count,
    size: row.size,
    indexedAt: row.indexed_at,
  }))
}

export function getTotalBlocks(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM blocks').get() as { count: number }
  return row.count
}

// ============ Transactions ============

export function insertTransaction(tx: IndexedTransaction): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO transactions
    (hash, block_number, block_hash, tx_index, from_address, to_address, value, input, nonce, status, contract_created, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tx.hash,
    tx.blockNumber,
    tx.blockHash,
    tx.txIndex,
    tx.fromAddress,
    tx.toAddress,
    tx.value,
    tx.input,
    tx.nonce,
    tx.status,
    tx.contractCreated,
    tx.indexedAt
  )
}

export function getTransaction(hash: string): IndexedTransaction | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM transactions WHERE hash = ?').get(hash) as any
  if (!row) return null
  return mapTransaction(row)
}

export function getTransactions(limit: number, offset: number): IndexedTransaction[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM transactions ORDER BY block_number DESC, tx_index DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[]
  return rows.map(mapTransaction)
}

export function getTransactionsByBlock(blockNumber: number): IndexedTransaction[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM transactions WHERE block_number = ? ORDER BY tx_index')
    .all(blockNumber) as any[]
  return rows.map(mapTransaction)
}

export function getAddressTransactions(
  address: string,
  limit: number,
  offset: number,
  direction: 'in' | 'out' | 'all' = 'all'
): IndexedTransaction[] {
  const db = getDb()
  const addressLower = address.toLowerCase()

  let query: string
  let params: any[]

  if (direction === 'in') {
    query = `SELECT * FROM transactions WHERE LOWER(to_address) = ?
             ORDER BY block_number DESC LIMIT ? OFFSET ?`
    params = [addressLower, limit, offset]
  } else if (direction === 'out') {
    query = `SELECT * FROM transactions WHERE LOWER(from_address) = ?
             ORDER BY block_number DESC LIMIT ? OFFSET ?`
    params = [addressLower, limit, offset]
  } else {
    query = `SELECT * FROM transactions
             WHERE LOWER(from_address) = ? OR LOWER(to_address) = ?
             ORDER BY block_number DESC LIMIT ? OFFSET ?`
    params = [addressLower, addressLower, limit, offset]
  }

  const rows = db.prepare(query).all(...params) as any[]
  return rows.map(mapTransaction)
}

export function getTotalTransactions(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number }
  return row.count
}

function mapTransaction(row: any): IndexedTransaction {
  return {
    hash: row.hash,
    blockNumber: row.block_number,
    blockHash: row.block_hash,
    txIndex: row.tx_index,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    value: row.value,
    input: row.input,
    nonce: row.nonce,
    status: row.status,
    contractCreated: row.contract_created,
    indexedAt: row.indexed_at,
  }
}

// ============ Events ============

export function insertEvent(event: IndexedEvent): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT OR REPLACE INTO events
    (tx_hash, log_index, block_number, address, topic0, topic1, topic2, topic3, data, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.txHash,
    event.logIndex,
    event.blockNumber,
    event.address,
    event.topic0,
    event.topic1,
    event.topic2,
    event.topic3,
    event.data,
    event.indexedAt
  )
  return result.lastInsertRowid as number
}

export function getEventsByAddress(
  address: string,
  limit: number,
  offset: number
): IndexedEvent[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM events WHERE LOWER(address) = ? ORDER BY block_number DESC, log_index LIMIT ? OFFSET ?`
    )
    .all(address.toLowerCase(), limit, offset) as any[]
  return rows.map(mapEvent)
}

export function getEventsByTopic(
  topic0: string,
  limit: number,
  offset: number
): IndexedEvent[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM events WHERE topic0 = ? ORDER BY block_number DESC LIMIT ? OFFSET ?')
    .all(topic0, limit, offset) as any[]
  return rows.map(mapEvent)
}

export function getEventsByTx(txHash: string): IndexedEvent[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM events WHERE tx_hash = ? ORDER BY log_index')
    .all(txHash) as any[]
  return rows.map(mapEvent)
}

export function getTotalEvents(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
  return row.count
}

function mapEvent(row: any): IndexedEvent {
  return {
    id: row.id,
    txHash: row.tx_hash,
    logIndex: row.log_index,
    blockNumber: row.block_number,
    address: row.address,
    topic0: row.topic0,
    topic1: row.topic1,
    topic2: row.topic2,
    topic3: row.topic3,
    data: row.data,
    indexedAt: row.indexed_at,
  }
}

// ============ Contracts ============

export function insertContract(contract: ContractABI): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO contracts
    (address, name, abi, is_proxy, implementation, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    contract.address.toLowerCase(),
    contract.name,
    contract.abi,
    contract.isProxy ? 1 : 0,
    contract.implementation,
    contract.addedAt
  )
}

export function getContract(address: string): ContractABI | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM contracts WHERE LOWER(address) = ?')
    .get(address.toLowerCase()) as any
  if (!row) return null
  return {
    address: row.address,
    name: row.name,
    abi: row.abi,
    isProxy: row.is_proxy === 1,
    implementation: row.implementation,
    addedAt: row.added_at,
  }
}

export function getAllContracts(): ContractABI[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM contracts ORDER BY added_at DESC').all() as any[]
  return rows.map((row) => ({
    address: row.address,
    name: row.name,
    abi: row.abi,
    isProxy: row.is_proxy === 1,
    implementation: row.implementation,
    addedAt: row.added_at,
  }))
}

// ============ Decoded Events ============

export function insertDecodedEvent(decoded: DecodedEvent): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO decoded_events
    (event_id, event_name, args, decoded_at)
    VALUES (?, ?, ?, ?)
  `).run(decoded.eventId, decoded.eventName, decoded.args, decoded.decodedAt)
}

export function getDecodedEvent(eventId: number): DecodedEvent | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM decoded_events WHERE event_id = ?').get(eventId) as any
  if (!row) return null
  return {
    eventId: row.event_id,
    eventName: row.event_name,
    args: row.args,
    decodedAt: row.decoded_at,
  }
}

export function getEventsWithDecoded(
  address: string,
  limit: number,
  offset: number
): Array<IndexedEvent & { decoded?: DecodedEvent }> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT e.*, d.event_name, d.args, d.decoded_at
       FROM events e
       LEFT JOIN decoded_events d ON e.id = d.event_id
       WHERE LOWER(e.address) = ?
       ORDER BY e.block_number DESC, e.log_index
       LIMIT ? OFFSET ?`
    )
    .all(address.toLowerCase(), limit, offset) as any[]

  return rows.map((row) => ({
    ...mapEvent(row),
    decoded: row.event_name
      ? {
          eventId: row.id,
          eventName: row.event_name,
          args: row.args,
          decodedAt: row.decoded_at,
        }
      : undefined,
  }))
}

// ============ Stats ============

export function getValidatorStats(): Array<{ miner: string; blockCount: number }> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT miner, COUNT(*) as block_count FROM blocks GROUP BY miner ORDER BY block_count DESC`
    )
    .all() as any[]
  return rows.map((row) => ({
    miner: row.miner,
    blockCount: row.block_count,
  }))
}

// ============ Bridge Payments ============

import type { BridgePayment } from '../types.js'

export function insertBridgePayment(payment: BridgePayment): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO bridge_payments
    (besu_proxy, order_id, amount, recipient, tx_hash, block_number, block_timestamp, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payment.besuProxy.toLowerCase(),
    payment.orderId,
    payment.amount,
    payment.recipient.toLowerCase(),
    payment.txHash,
    payment.blockNumber,
    payment.blockTimestamp,
    payment.indexedAt
  )
}

export function getBridgePayments(limit: number, offset: number): BridgePayment[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM bridge_payments ORDER BY block_number DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[]
  return rows.map(mapBridgePayment)
}

export function getBridgePaymentByOrder(besuProxy: string, orderId: string): BridgePayment | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM bridge_payments WHERE LOWER(besu_proxy) = ? AND order_id = ?')
    .get(besuProxy.toLowerCase(), orderId) as any
  if (!row) return null
  return mapBridgePayment(row)
}

export function getTotalBridgePayments(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM bridge_payments').get() as { count: number }
  return row.count
}

export function getLastBridgeSyncBlock(): number {
  const value = getState('last_bridge_sync_block')
  return value ? parseInt(value, 10) : -1
}

export function setLastBridgeSyncBlock(blockNumber: number): void {
  setState('last_bridge_sync_block', blockNumber.toString())
}

function mapBridgePayment(row: any): BridgePayment {
  return {
    id: row.id,
    besuProxy: row.besu_proxy,
    orderId: row.order_id,
    amount: row.amount,
    recipient: row.recipient,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    blockTimestamp: row.block_timestamp,
    indexedAt: row.indexed_at,
  }
}
