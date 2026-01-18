import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { config } from '../config.js'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  // Ensure data directory exists
  const dbDir = dirname(config.dbPath)
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(config.dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -64000') // 64MB cache

  // Create tables
  db.exec(`
    -- Blocks table
    CREATE TABLE IF NOT EXISTS blocks (
      number INTEGER PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      parent_hash TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      miner TEXT NOT NULL,
      transaction_count INTEGER NOT NULL,
      size INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_blocks_miner ON blocks(miner);

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL,
      block_hash TEXT NOT NULL,
      tx_index INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT,
      value TEXT NOT NULL,
      input TEXT NOT NULL,
      nonce INTEGER NOT NULL,
      status TEXT NOT NULL,
      contract_created TEXT,
      indexed_at INTEGER NOT NULL,
      FOREIGN KEY (block_number) REFERENCES blocks(number)
    );

    CREATE INDEX IF NOT EXISTS idx_tx_block ON transactions(block_number);
    CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address);
    CREATE INDEX IF NOT EXISTS idx_tx_contract ON transactions(contract_created);
    CREATE INDEX IF NOT EXISTS idx_tx_from_block ON transactions(from_address, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_to_block ON transactions(to_address, block_number DESC);

    -- Events table (raw logs)
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      address TEXT NOT NULL,
      topic0 TEXT,
      topic1 TEXT,
      topic2 TEXT,
      topic3 TEXT,
      data TEXT NOT NULL,
      indexed_at INTEGER NOT NULL,
      UNIQUE(tx_hash, log_index),
      FOREIGN KEY (tx_hash) REFERENCES transactions(hash)
    );

    CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
    CREATE INDEX IF NOT EXISTS idx_events_address ON events(address);
    CREATE INDEX IF NOT EXISTS idx_events_topic0 ON events(topic0);
    CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON events(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_events_address_block ON events(address, block_number DESC);

    -- Contracts table (known ABIs)
    CREATE TABLE IF NOT EXISTS contracts (
      address TEXT PRIMARY KEY,
      name TEXT,
      abi TEXT,
      is_proxy INTEGER DEFAULT 0,
      implementation TEXT,
      added_at INTEGER NOT NULL
    );

    -- Decoded events table
    CREATE TABLE IF NOT EXISTS decoded_events (
      event_id INTEGER PRIMARY KEY,
      event_name TEXT NOT NULL,
      args TEXT NOT NULL,
      decoded_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_decoded_name ON decoded_events(event_name);

    -- Indexer state table
    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Bridge payments table (Base Sepolia PaymentRecorded events)
    CREATE TABLE IF NOT EXISTS bridge_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      besu_proxy TEXT NOT NULL,
      order_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      recipient TEXT NOT NULL,
      tx_hash TEXT NOT NULL UNIQUE,
      block_number INTEGER NOT NULL,
      block_timestamp INTEGER,
      indexed_at INTEGER NOT NULL,
      UNIQUE(besu_proxy, order_id)
    );

    CREATE INDEX IF NOT EXISTS idx_bridge_payments_proxy ON bridge_payments(besu_proxy);
    CREATE INDEX IF NOT EXISTS idx_bridge_payments_order ON bridge_payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_bridge_payments_block ON bridge_payments(block_number DESC);
  `)

  // Initialize state if not exists
  const initState = db.prepare(`
    INSERT OR IGNORE INTO indexer_state (key, value) VALUES (?, ?)
  `)
  initState.run('last_indexed_block', '-1')
  initState.run('sync_status', 'idle')
  initState.run('started_at', Date.now().toString())

  console.log(`Database initialized at ${config.dbPath}`)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database closed')
  }
}
