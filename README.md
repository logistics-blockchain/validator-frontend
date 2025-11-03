# Logistics NFT Development UI

A lightweight, TypeScript-based development UI for the Hardhat-based blockchain logistics management system. Built with Vite + React + TypeScript + Viem.

## Features

- **Account Management**: Switch between 10 Hardhat test accounts with real-time balance updates
- **Contract Discovery**: Automatically detects and displays deployed contracts
- **UUPS Proxy Detection**: Identifies proxy contracts and uses implementation ABIs
- **Dynamic Function Forms**: Auto-generated forms for all contract functions (read & write)
- **Real-time Monitoring**: Live block updates and transaction feed
- **Type-safe**: Full TypeScript support with Viem's type inference

## Quick Start

### Prerequisites

1. Make sure Hardhat node is running in the parent directory:
   ```bash
   cd .. && npx hardhat node
   ```

2. Deploy the contracts (in parent directory):
   ```bash
   cd .. && npx tsx scripts/deploy.ts
   ```

3. Sync artifacts to frontend:
   ```bash
   npm run sync
   ```

### Run the UI

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage

### Read Functions
1. Select a contract from the dashboard
2. Click the "Read" tab
3. Enter parameters and click "Read"

### Write Functions
1. Select an account with appropriate permissions
2. Select a contract
3. Click the "Write" tab
4. Fill in parameters and click "Execute"

## Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run sync     # Sync artifacts from parent directory
```

## Tech Stack

- Vite 7 + React 19 + TypeScript 5.9
- Viem 2.37.12 (Modern Ethereum library)
- Zustand 5 (State management)
- Tailwind CSS 3.4 (Styling)

## Troubleshooting

**"No contracts deployed"**: Run `npm run sync` to copy artifacts

**Connection issues**: Ensure Hardhat node is running on http://127.0.0.1:8545
