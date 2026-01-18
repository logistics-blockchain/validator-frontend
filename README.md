# Validator Frontend

Development UI and blockchain indexer for logistics management. Supports Besu and Hardhat networks.

## Structure

```
├── src/           # React frontend
├── indexer/       # Blockchain indexer (Node.js)
├── public/        # Static assets & config
└── api/           # Vercel API routes
```

## Quick Start

### Frontend

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Indexer

```bash
cd indexer
npm install
npm run dev
```

API runs on http://localhost:3001

## Configuration

### Networks

Edit `public/networks.config.json`:

```json
{
  "networks": [{
    "id": "besu-local",
    "name": "Besu Local",
    "chainId": 10001,
    "rpcUrl": "http://127.0.0.1:8545",
    "enabled": true
  }],
  "defaultNetwork": "besu-local"
}
```

### Environment

Frontend `.env`:
```env
VITE_PRIVATE_KEYS=key1,key2,key3
VITE_DEFAULT_NETWORK=besu-local
```

Indexer `.env`:
```env
RPC_URL=http://127.0.0.1:8545
DATABASE_PATH=./data/indexer.db
PORT=3001
```

## Tech Stack

**Frontend**: Vite, React, TypeScript, Viem, Zustand, Tailwind CSS

**Indexer**: Node.js, Express, SQLite, Viem
