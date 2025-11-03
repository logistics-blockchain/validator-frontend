# Block Explorer Implementation

## Overview

A low-level, gasless block explorer built for the Hardhat-based logistics blockchain. The explorer is designed for a permissioned, gasless chain focused on order and intellectual property management.

## Features

### Current Implementation

- **Block List View**: Display recent blocks with key information
  - Block number, timestamp, transaction count
  - Validator address (miner)
  - Block size and hash
  - Sortable by most recent blocks

- **Block Details View**: Detailed information about a specific block
  - Full block metadata (hash, parent hash, timestamp)
  - List of all transactions in the block
  - Click-through to transaction details

- **Transaction Details View**: Comprehensive transaction information
  - Transaction hash, status (success/reverted)
  - From/To addresses
  - Value transferred
  - Input data (calldata)
  - Transaction receipt with logs/events
  - Event log details with topics and data

- **Navigation**: Simple view-based navigation
  - Dashboard ↔ Block Explorer toggle in header
  - Block List → Block Details → Transaction Details
  - Back buttons for easy navigation

### Design Decisions

1. **No Gas Fields**: Removed all gas-related displays (gas price, gas used, fees)
   - Designed for gasless blockchain
   - Cleaner UI focused on order/transaction data

2. **Low-Level Focus**: Shows raw blockchain data
   - Block hashes, transaction hashes
   - Raw input data and event logs
   - No business logic interpretation (can be added separately)

3. **Viem Integration**: Uses existing Viem publicClient
   - Leverages current infrastructure
   - Type-safe with TypeScript
   - Efficient data fetching

4. **Consistent UI**: Matches existing dashboard styling
   - Same Card components
  - Consistent spacing and layout
   - Responsive design

## File Structure

```
frontend/src/
├── types/
│   └── explorer.ts                    # Type definitions (BlockInfo, TransactionInfo, etc.)
├── hooks/
│   └── useBlockHistory.ts             # Data fetching hooks
├── components/
│   ├── BlockExplorer.tsx              # Block list view
│   ├── BlockDetails.tsx               # Single block view
│   ├── TransactionDetails.tsx         # Transaction view
│   └── ExplorerView.tsx               # Navigation controller
└── App.tsx                            # Main app with navigation
```

## Type Definitions

### BlockInfo
```typescript
interface BlockInfo {
  number: bigint
  hash: Hash
  parentHash: Hash
  timestamp: bigint
  miner: Address              // Validator
  transactionCount: number
  size: bigint
  transactions: Hash[]
  // No gas fields
}
```

### TransactionInfo
```typescript
interface TransactionInfo {
  hash: Hash
  blockNumber: bigint
  blockHash: Hash
  from: Address
  to: Address | null
  value: bigint
  input: string              // Calldata
  nonce: number
  transactionIndex: number
  timestamp?: bigint
  status?: 'success' | 'reverted'
  // No gas fields
}
```

### TransactionReceipt
```typescript
interface TransactionReceipt {
  transactionHash: Hash
  blockNumber: bigint
  blockHash: Hash
  from: Address
  to: Address | null
  contractAddress: Address | null
  status: 'success' | 'reverted'
  logs: TransactionLog[]
}
```

## Usage

### View Recent Blocks
1. Click "Block Explorer" in the header navigation
2. See last 20 blocks (configurable: 10, 20, 50, 100)
3. Click "Refresh" to reload

### View Block Details
1. Click on any block row in the list
2. See full block information
3. View all transactions in the block
4. Click "Back to Blocks" to return

### View Transaction Details
1. From block details, click on any transaction hash
2. See full transaction information
3. View transaction receipt and event logs
4. Click "Back" to return to block

## Hooks

### `useBlockHistory(count: number)`
Fetches the last N blocks from the blockchain.

**Returns:**
- `blocks`: Array of BlockInfo
- `loading`: Boolean loading state
- `refresh`: Function to reload blocks

**Example:**
```typescript
const { blocks, loading, refresh } = useBlockHistory(20)
```

### `useBlock(blockNumber: bigint | null)`
Fetches a single block by number.

**Returns:**
- `block`: BlockInfo or null
- `loading`: Boolean loading state

**Example:**
```typescript
const { block, loading } = useBlock(12345n)
```

### `useTransaction(txHash: Hash | null)`
Fetches transaction and receipt by hash.

**Returns:**
- `transaction`: TransactionInfo or null
- `receipt`: TransactionReceipt or null
- `loading`: Boolean loading state

**Example:**
```typescript
const { transaction, receipt, loading } = useTransaction('0x...')
```

## Future Enhancements

### Possible Additions (as needed)

1. **Address Explorer**
   - View all transactions for an address
   - Balance and transaction count
   - Contract code viewer

2. **Search Functionality**
   - Search by block number
   - Search by transaction hash
   - Search by address

3. **Real-time Updates**
   - Auto-refresh on new blocks
   - Live transaction monitoring
   - WebSocket integration

4. **Business Logic Layer** (separate from low-level explorer)
   - Decode logistics contract events
   - Show order state changes
   - Manufacturer activity tracking
   - Order lifecycle visualization

5. **Privacy Features** (for permissioned chain)
   - Role-based data filtering
   - Encrypted transaction data handling
   - Access control for sensitive information

6. **Advanced Filtering**
   - Filter by transaction type
   - Filter by contract address
   - Filter by time range
   - Export to CSV

7. **Performance Optimizations**
   - Pagination for large block ranges
   - Caching layer
   - Virtual scrolling for large lists

## EVM Compatibility

The explorer is fully compatible with:
- **Hardhat Network** (current)
- **Hyperledger Besu** (EVM-compatible, requires minimal changes)
- **Any EVM chain** with Viem support

### Migration Notes for Besu

If switching to Hyperledger Besu:

1. **Update RPC endpoint** in `lib/viem.ts`:
   ```typescript
   const publicClient = createPublicClient({
     chain: besuChain,  // Define custom chain
     transport: http('http://localhost:8545')
   })
   ```

2. **No code changes required** - Viem handles EVM compatibility

3. **Optional**: Add Besu-specific features
   - Privacy group support
   - Permissioning checks
   - Enterprise features

Estimated migration time: **~1 hour**

## Testing

The explorer integrates with existing infrastructure:
- Uses current `blockchainStore` for current block
- Uses current `publicClient` for queries
- No additional setup required

To test:
1. Start Hardhat node: `npx hardhat node`
2. Deploy contracts: `npx tsx scripts/deploy.ts`
3. Start frontend: `npm run dev`
4. Click "Block Explorer" in header
5. Create some transactions to populate blocks

## Notes

- **Low-level by design**: Shows raw blockchain data without interpretation
- **Business metrics separate**: Advanced analytics can be built as separate view
- **Gasless focused**: No gas displays, suitable for enterprise/permissioned chains
- **Type-safe**: Full TypeScript support with Viem types
- **Extensible**: Easy to add new features without affecting core functionality
