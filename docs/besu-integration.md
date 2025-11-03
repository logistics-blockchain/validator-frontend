# Frontend Integration with Besu Local Chain

## Overview

The frontend is now fully integrated with the Besu local QBFT chain. It automatically detects which chain is running (Besu or Hardhat) and configures itself accordingly.

## Current Setup

### Besu Chain
- **Chain ID**: 10001
- **RPC Endpoint**: http://localhost:8545
- **Consensus**: QBFT (4 validators)
- **Gas Price**: 0 (free transactions)
- **Block Time**: 2 seconds

### Frontend
- **Dev Server**: http://localhost:3000
- **Auto Chain Detection**: Automatically detects Besu (10001) vs Hardhat (31337)
- **Account Management**: 4 Besu validator accounts available

## Deployed Contracts (Besu)

| Contract | Address |
|----------|---------|
| **ManufacturerRegistry** | `0x815c58aaec1abb7798d6a4474597fa3bcfd359bd` |
| **LogisticsOrder V1 (impl)** | `0xaec3e0ea11f6a195b8b5e1a7b43f6140c01f9125` |
| **LogisticsOrder V2 (impl)** | `0x050a96b4deba9f4739d09dad05cc5c235bd84653` |
| **LogisticsOrderProxy** ⭐ | `0x9662901c858c16541fa99eb8a11740b608e8e8ba` |

**Always interact with the proxy address!**

## Available Accounts

The frontend has access to all 4 Besu validator accounts:

| Index | Address | Role |
|-------|---------|------|
| 0 | `0x415dd919df8f7702ab2f95d7f07ef57d63e92b55` | Validator 0 (Deployer) |
| 1 | `0x2c0f004034bf831c10c9144e5637c4b9d95fa087` | Validator 1 |
| 2 | `0x55fbd9d24093e0ed7c2e6f1d9d9095d1b2533bf4` | Validator 2 |
| 3 | `0x6100804bff3e58c0b2ccde32fc447d0ffa651442` | Validator 3 |

All accounts are pre-funded with massive ETH balances for testing.

## Quick Start

### 1. Ensure Besu Chain is Running

```bash
# Check if Besu is running
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x2711"}
# 0x2711 = 10001 (Besu chain ID)

# If not running, start it:
./besu-start-qbft.sh
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3000

### 3. Sync Artifacts (if needed)

```bash
cd frontend
npm run sync
```

This copies:
- Contract ABIs from `../artifacts/`
- Deployment info from `../deployment-besu.json`

## How Auto-Detection Works

### Chain Detection

`frontend/src/lib/viem.ts` automatically detects the chain:

```typescript
// Queries eth_chainId when app loads
// If 10001 → Uses besuLocal chain
// If 31337 → Uses hardhat chain
```

### Deployment Detection

`frontend/src/lib/deploymentDetection.ts` checks for deployment files in order:

1. `deployment-factory.json` (Factory pattern)
2. `deployment-besu.json` (Besu shared proxy) ✅ Current
3. `deployment-info.json` (Hardhat shared proxy)

### Account Selection

The frontend automatically uses the correct accounts:
- **Besu Chain (10001)**: 4 validator accounts
- **Hardhat Chain (31337)**: 20 test accounts

## Frontend Features

### Available in UI

1. **Account Management Panel**
   - Switch between 4 Besu validator accounts
   - View account balances
   - See transaction history

2. **Contract Dashboard**
   - Interact with ManufacturerRegistry
   - Create and manage logistics orders
   - View order state transitions
   - Monitor NFT ownership

3. **Realtime Monitor**
   - Watch new blocks (every 2 seconds)
   - View transaction confirmations
   - Monitor event emissions

4. **Block Explorer**
   - Browse blocks and transactions
   - View contract interactions
   - Inspect event logs

## Usage Examples

### Register a Manufacturer

```typescript
// In the frontend UI:
// 1. Select Account 0 (deployer/owner)
// 2. Go to ManufacturerRegistry contract
// 3. Call: registerManufacturer(address, name)
//    - address: 0x2c0f004034bf831c10c9144e5637c4b9d95fa087 (Validator 1)
//    - name: "Test Manufacturer"
// 4. Transaction is free (0 gas)
// 5. Immediate finality (confirmed in ~2 seconds)
```

### Create an Order

```typescript
// 1. Switch to Account 1 (now registered manufacturer)
// 2. Go to LogisticsOrderProxy contract
// 3. Call: createOrder(receiver, ipfsHash)
//    - receiver: 0x55fbd9d24093e0ed7c2e6f1d9d9095d1b2533bf4 (Validator 2)
//    - ipfsHash: "QmExample123..."
// 4. Order created as NFT owned by receiver
// 5. Manufacturer can update state
```

### Update Order State

```typescript
// 1. Still as Account 1 (manufacturer who created order)
// 2. Go to LogisticsOrderProxy contract
// 3. Call: updateState(tokenId, newState)
//    - tokenId: 1
//    - newState: 1 (PickedUp)
// 4. State transitions: Created → PickedUp → InTransit → AtFacility → Delivered
```

## Technical Details

### Zero Gas Configuration

All transactions use `gasPrice: 0n`:

```typescript
// Automatically configured by viem.ts
const tx = await walletClient.writeContract({
  address: contractAddress,
  abi: contractABI,
  functionName: 'functionName',
  args: [arg1, arg2],
  // gasPrice: 0n is set automatically for Besu
})
```

### QBFT Consensus

- **Block Finality**: Immediate (no waiting for confirmations)
- **Block Time**: 2 seconds
- **Validator Quorum**: 3 of 4 validators must agree
- **No Reorgs**: Blocks are final once committed

### Contract Upgrades

The frontend works with the proxy pattern:
- Always interacts with proxy address (`0x9662...8ba`)
- Upgrades can be performed without changing frontend config
- Storage preserved across upgrades

## Troubleshooting

### Frontend Can't Connect to Chain

```bash
# Check if Besu is running
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'

# Should return 3 peers (other validators)
# If 0 peers or no response:
./besu-stop-qbft.sh
rm -rf besu-data/
./besu-start-qbft.sh
```

### Frontend Shows Wrong Chain

Check browser console for chain detection logs:
```
🔗 Detected Besu Local chain (10001)
✅ Besu deployment detected (shared proxy pattern)
```

If showing wrong chain:
1. Clear browser cache
2. Restart frontend dev server
3. Verify Besu is running on port 8545

### Transactions Failing

Check account is registered:
```bash
# Using curl or frontend
# Call: isRegistered(accountAddress)
# Must return true to create orders
```

### Deployment File Not Found

```bash
# Ensure deployment-besu.json is in frontend/public/
ls -la frontend/public/deployment-besu.json

# If missing:
cp deployment-besu.json frontend/public/

# Also sync artifacts:
cd frontend && npm run sync
```

## Development Workflow

### Typical Development Session

```bash
# 1. Start Besu chain
./besu-start-qbft.sh

# 2. Deploy contracts (if needed)
npm run deploy:besu

# 3. Sync artifacts to frontend
cd frontend && npm run sync

# 4. Start frontend
npm run dev

# 5. Open browser to http://localhost:3000

# 6. When done, stop everything
cd .. && ./besu-stop-qbft.sh
# (Frontend dev server: Ctrl+C)
```

### Redeploying Contracts

```bash
# Stop chain
./besu-stop-qbft.sh

# Clear blockchain data (fresh start)
rm -rf besu-data/

# Restart chain
./besu-start-qbft.sh

# Redeploy contracts
npm run deploy:besu

# Sync to frontend
cp deployment-besu.json frontend/public/
cd frontend && npm run sync
```

### Testing Contract Upgrades

```bash
# Deploy V2 implementation (already deployed)
# V2 address: 0x050a96b4deba9f4739d09dad05cc5c235bd84653

# In frontend:
# 1. Select Account 0 (owner)
# 2. Call: upgradeToAndCall(newImpl, "0x")
#    - newImpl: 0x050a96b4deba9f4739d09dad05cc5c235bd84653
#    - data: "0x"
# 3. Verify version changed
# 4. Old orders still accessible
# 5. New features (tracking data) available
```

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/lib/viem.ts` | Added Besu chain + validator accounts + auto-detection |
| `frontend/src/lib/deploymentDetection.ts` | Added deployment-besu.json detection |
| `frontend/public/deployment-besu.json` | Copied from root (contract addresses) |
| `frontend/public/artifacts/` | Synced contract ABIs |

## Next Steps

### Ready to Test
- ✅ Chain running (Besu QBFT)
- ✅ Contracts deployed
- ✅ Frontend configured
- ✅ Auto-detection working
- ✅ All accounts available

### Try These Features
1. Register manufacturers using the UI
2. Create orders as NFTs
3. Update order states through lifecycle
4. Monitor events in realtime
5. Browse transactions in block explorer
6. Test contract upgrades (V1 → V2)

### Optional Enhancements
- Add IPFS integration for order metadata
- Create order templates
- Add batch operations
- Implement order filtering/search
- Add analytics dashboard
- Create mobile-responsive layouts

## Reference Links

- **Besu Chain Guide**: `BESU_CHAIN_GUIDE.md`
- **Project Documentation**: `PROJECT_SUMMARY.md`
- **Contract Addresses**: `deployment-besu.json`
- **Deployment Script**: `scripts/deploy-besu.ts`
- **Frontend Viem Config**: `frontend/src/lib/viem.ts`

## Support

For chain-specific issues (consensus, networking, validators):
```bash
/besu your-question
```

For frontend issues, check:
- Browser console for errors
- Network tab for failed requests
- Besu logs: `tail -f besu-data/node0.log`
