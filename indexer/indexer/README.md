# Blockchain Indexer

Lightweight SQLite-based indexer for Besu QBFT blockchain. Indexes blocks, transactions, and events, with optional ABI decoding.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start (dev mode with auto-reload)
npm run dev

# Start (production)
npm start
```

## API Endpoints

### Blocks
- `GET /api/blocks?limit=20&offset=0` - Recent blocks
- `GET /api/blocks/:number` - Single block
- `GET /api/blocks/:number/transactions` - Transactions in block

### Transactions
- `GET /api/transactions?limit=20&offset=0` - Recent transactions
- `GET /api/transactions/:hash` - Single transaction with events
- `GET /api/address/:address/transactions?limit=50&direction=all` - Address transactions
  - `direction=in|out|all`

### Events
- `GET /api/address/:address/events?limit=50` - Events from contract
- `GET /api/address/:address/events/decoded` - Events with decoded data
- `GET /api/events?topic0=0x...` - Events by signature

### Contracts
- `GET /api/contracts` - List registered contracts
- `GET /api/contracts/:address` - Contract info
- `POST /api/contracts` - Register ABI
- `POST /api/contracts/:address/decode` - Decode historical events

### Stats
- `GET /api/stats` - Chain statistics
- `GET /api/stats/validators` - Validator block production
- `GET /api/health` - Health check

## Docker

```bash
# Build and run
docker-compose up -d

# With custom RPC
RPC_URL=http://your-node:8545 docker-compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| RPC_URL | http://130.61.22.253:8545 | Besu RPC endpoint |
| PORT | 3001 | API server port |
| DB_PATH | ./data/indexer.db | SQLite database path |
| SYNC_FROM_BLOCK | 0 | Start sync from block |
| POLL_INTERVAL_MS | 5000 | Block polling interval |
| RATE_LIMIT_MAX | 100 | Max requests per minute |
| CORS_ORIGINS | localhost:5173 | Allowed CORS origins |

## Registering Contract ABIs

```bash
curl -X POST http://localhost:3001/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x0da2be2b1f488d80957e817398e2e4b75c20a755",
    "name": "MLModelRegistry",
    "abi": [...]
  }'

# Decode historical events for contract
curl -X POST http://localhost:3001/api/contracts/0x0da2.../decode
```
