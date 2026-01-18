# UI Quick Start Guide

This guide will help you start the development UI for the Logistics NFT prototype.

## Prerequisites

Ensure you have:
- Node.js 18+ installed
- The contracts deployed to a running Hardhat node

## Step-by-Step Instructions

### 1. Start Hardhat Node

In Terminal 1 (from project root):
```bash
npx hardhat node
```

Keep this terminal running. You should see 20 test accounts with their addresses and private keys.

### 2. Deploy Contracts

In Terminal 2 (from project root):
```bash
npx tsx scripts/deploy.ts
```

You should see deployment addresses for:
- ManufacturerRegistry
- LogisticsOrderImplementationV1
- LogisticsOrderProxy

### 3. Start the UI

In Terminal 3 (from project root):
```bash
cd frontend
npm install  # Only needed first time
npm run sync # Sync deployment info and ABIs
npm run dev
```

### 4. Open the UI

Open your browser to http://localhost:3000

You should see:
- **Left side**: Account management panel showing Account #0 with balance
- **Left side**: Real-time monitor showing current block
- **Right side**: Contract dashboard with 3 deployed contracts

## Using the UI

### Switch Accounts
Use the dropdown in the Account Management panel to switch between 10 Hardhat test accounts.

### Interact with Contracts

**Example: Check if an address is a manufacturer**
1. Find "ManufacturerRegistry" contract
2. Click "Read" tab
3. Find `isRegistered` function
4. Enter an address (e.g., `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
5. Click "Read"

**Example: Register a manufacturer**
1. Select Account #0 (the deployer/owner)
2. Find "ManufacturerRegistry" contract
3. Click "Write" tab
4. Find `registerManufacturer` function
5. Enter:
   - addr: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Account #1)
   - name: `Test Manufacturer`
6. Click "Execute"
7. View transaction receipt

**Example: Create an order**
1. First, register a manufacturer (see above)
2. Switch to that manufacturer's account
3. Find "LogisticsOrderProxy" contract (this uses the LogisticsOrder implementation)
4. Click "Write" tab
5. Find `createOrder` function
6. Enter:
   - receiver: Any address (e.g., `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`)
   - ipfsHash: Any string (e.g., `QmTest123`)
7. Click "Execute"
8. View transaction receipt with the new NFT token ID

### Monitor Activity
- Watch the Real-time Monitor for new blocks
- Each transaction updates the block count
- Account balances update automatically

## Proxy Contracts

The UI automatically detects UUPS proxies:
- "LogisticsOrderProxy" shows a "UUPS Proxy" badge
- Implementation address is displayed
- Functions from the implementation contract are shown
- Transactions are sent to the proxy address

## Troubleshooting

**UI shows "No contracts deployed"**
- Run `npm run sync` in the frontend directory
- Check that `deployment-info.json` exists in `frontend/public/`

**Connection error**
- Ensure Hardhat node is running on port 8545
- Restart the node if needed: `npx hardhat node`

**Transaction fails**
- Check you're using the correct account (e.g., owner for admin functions)
- Ensure the manufacturer is registered before creating orders
- Check the error message in the UI

**Balance not updating**
- Balances update every 2 seconds
- Try switching accounts and back

## Next Steps

Once you're comfortable with the UI:
1. Try the full order lifecycle: Create → PickedUp → InTransit → AtFacility → Delivered
2. Register multiple manufacturers and create orders from different accounts
3. Test the proxy upgrade process (see PROJECT_SUMMARY.md)

## File Structure

```
logistics_prototype/
├── contracts/           # Solidity contracts
├── scripts/
│   └── deploy.ts       # Deployment script
├── frontend/           # React UI
│   ├── src/
│   ├── public/
│   │   ├── artifacts/  # Contract ABIs (synced)
│   │   └── deployment-info.json
│   └── sync-artifacts.sh
└── deployment-info.json # Contract addresses
```

## Useful Commands

```bash
# Root directory
npx hardhat node         # Start local blockchain
npx tsx scripts/deploy.ts # Deploy contracts
npm run test:mocha       # Run tests

# Frontend directory
npm run dev              # Start UI (port 3000)
npm run sync             # Sync artifacts
npm run build            # Build for production
```

## Tips

- Use Account #0 for admin operations (it's the deployer/owner)
- Copy private keys from the UI to import into MetaMask (for testing external wallets)
- The UI shows real-time gas usage for transactions
- All state is preserved between UI refreshes (stored on the blockchain)
- Restart Hardhat node to reset all state
