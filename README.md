# Validator Frontend

Development UI for blockchain logistics management. Supports Besu and Hardhat networks.

## Features

- Multi-network support with network selector
- Account management with balance tracking
- Contract discovery and UUPS proxy detection
- Dynamic function forms for contract interaction
- Block explorer with transaction/address views
- Validator monitoring and network health
- Real-time block updates

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

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

### Accounts

Create `.env`:

```env
VITE_PRIVATE_KEYS=key1,key2,key3
VITE_DEFAULT_NETWORK=besu-local
```

## Tech Stack

- Vite + React + TypeScript
- Viem (Ethereum library)
- Zustand (State management)
- Tailwind CSS

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
```
