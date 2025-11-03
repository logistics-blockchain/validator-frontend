# Account and Contract Pages - Implementation Complete

## Overview

Added comprehensive Account and Contract pages to the block explorer, enabling users to view detailed information about any address on the blockchain.

## New Pages

### 1. Account Page (`/explorer/address/:address`)

**Purpose**: View activity and state for any blockchain address (EOA or contract)

**Features**:
- **Address Information Header**
  - Full address with copy button
  - Type indicator (Contract or EOA)
  - Current balance (ETH)
  - Total transaction count
  - Contract name (if known)
  - Proxy detection (type and implementation address)
  - "View Contract Interface" button for known contracts

- **Transactions Tab**
  - All transactions involving this address
  - Direction badges (IN/OUT/SELF/CREATE)
  - From/To addresses (clickable)
  - Value transferred
  - Status (Success/Failed)
  - Click transaction to view details

- **Events Tab** (contracts only)
  - All events emitted by the contract
  - Decoded event names and parameters
  - Click event to view full transaction

- **Code Tab** (contracts only)
  - Contract bytecode display
  - Scrollable hex viewer

### 2. Contract Page (`/explorer/contract/:address`)

**Purpose**: Interact with known contracts from our contracts list

**Features**:
- **Contract Information Header**
  - Contract name (friendly name)
  - Address with copy button
  - Proxy badge and implementation link
  - Balance and transaction count
  - "View in Account Explorer" button

- **Read Tab**
  - All view/pure functions
  - Reuses existing FunctionForm component
  - Query contract state

- **Write Tab**
  - All nonpayable/payable functions
  - Reuses existing FunctionForm component
  - Execute transactions with wallet

- **Events Tab**
  - All events emitted by contract
  - Fully decoded using contract ABI
  - Filter by event type
  - Click to view transaction

- **Transactions Tab**
  - All transactions to/from contract
  - Same as Account page

- **Code Tab**
  - Contract bytecode
  - Contract ABI (formatted JSON)
  - Copyable and scrollable

## Navigation Flow

```
Block Explorer (List)
    ↓ Click Block
Block Details
    ↓ Click Transaction
Transaction Details
    ↓ Click Address → Checks if known contract
    ├─→ Known Contract → Contract Page
    └─→ Unknown/EOA → Account Page

Contract Page ←→ Account Page (mutual links)
```

## Shared Components

### AddressDisplay
Reusable component for displaying addresses with:
- Optional label
- Full or shortened display
- Copy button
- Contract badge
- Contract name badge
- Click handler

### TransactionList
Table component for displaying transactions with:
- Transaction hash
- Block number
- Age (time ago)
- Direction badge (IN/OUT/SELF/CREATE)
- From/To addresses (clickable)
- Value in ETH
- Status badge (Success/Failed)
- Click handlers for transactions and addresses
- Loading state

## Hooks

### useAddressData
Fetches comprehensive address information:
- Balance
- Transaction count
- Contract detection (bytecode check)
- Contract name (from contracts store)
- Proxy detection (type, implementation)

**Usage**:
```typescript
const { addressInfo, loading } = useAddressData(address)
```

### useAddressTransactions
Scans recent blocks to find all transactions involving an address:
- Direction detection (in/out/self/create)
- Transaction metadata
- Receipt status

**Parameters**:
- `address`: Address to search for
- `maxBlocks`: Number of recent blocks to scan (default: 50)

**Usage**:
```typescript
const { transactions, loading } = useAddressTransactions(address, 50)
```

### useAddressEvents
Scans recent blocks to find all events emitted by a contract:
- Event logs with transaction context
- Block timestamp
- Transaction hash

**Parameters**:
- `address`: Contract address
- `maxBlocks`: Number of recent blocks to scan (default: 50)

**Usage**:
```typescript
const { events, loading } = useAddressEvents(address, 50)
```

## Type Definitions

### AddressInfo
```typescript
interface AddressInfo {
  address: Address
  balance: bigint
  transactionCount: number
  isContract: boolean
  code?: string
  contractName?: string
  isProxy?: boolean
  proxyType?: string
  implementation?: Address
}
```

### TransactionWithMetadata
```typescript
interface TransactionWithMetadata extends TransactionInfo {
  direction?: 'in' | 'out' | 'self' | 'create'
  methodName?: string
}
```

### EventWithContext
```typescript
interface EventWithContext extends TransactionLog {
  transactionHash: Hash
  blockNumber: bigint
  timestamp?: bigint
}
```

## Routing Logic

The ExplorerView component now handles 5 view types:

1. **'list'** - Block explorer list view
2. **'block'** - Block details view
3. **'transaction'** - Transaction details view
4. **'account'** - Account/address view
5. **'contract'** - Contract interface view

**Smart Routing**:
When a user clicks an address, the system checks if it's a known contract:
- **If in contracts store** → Navigate to Contract Page
- **If not in contracts store** → Navigate to Account Page

This provides the best UX - known contracts get full interface, unknown addresses get generic view.

## Key Features

### 1. Address Click Navigation
Every address in the explorer is now clickable:
- Transaction from/to addresses
- Event log contract addresses
- Implementation addresses in proxy info

### 2. Bidirectional Navigation
- Contract Page → "View in Account Explorer" → Account Page
- Account Page → "View Contract Interface" → Contract Page
- All pages have back buttons to return to previous view

### 3. Event Decoding
Events are automatically decoded when:
- Contract is in our contracts store (has ABI)
- Event signature matches ABI

Shows:
- Event name badge
- Decoded parameters
- Human-readable values (addresses, numbers, strings)

### 4. Transaction Direction Detection
Automatically determines transaction direction:
- **IN**: Received by this address
- **OUT**: Sent from this address
- **SELF**: Internal transaction (from = to)
- **CREATE**: Contract deployment

### 5. Real-time Data
All data fetched in real-time from blockchain:
- No backend required
- Always up-to-date
- Works with any EVM chain

## Performance Considerations

### Block Scanning
Currently scans last 50 blocks for transactions/events:
- **Fast**: On local Hardhat (~1 second)
- **Moderate**: On testnet with low activity (~5 seconds)
- **Slow**: On mainnet with high activity (~30+ seconds)

**Future Optimizations**:
- Implement pagination
- Add caching layer
- Use event filters/indexing
- Limit scan range with UI controls

### Data Loading
- All data loading is async with loading states
- Independent tabs load data on-demand
- Failed loads don't crash the page

## Files Created

```
frontend/src/
├── types/
│   └── explorer.ts (updated)       # Added AddressInfo, TransactionWithMetadata
├── hooks/
│   ├── useAddressData.ts          # Address info fetching
│   ├── useAddressTransactions.ts  # Transaction scanning
│   └── useAddressEvents.ts        # Event scanning
├── components/
│   ├── AddressDisplay.tsx         # Reusable address component
│   ├── TransactionList.tsx        # Reusable transaction table
│   ├── AccountPage.tsx            # Generic address viewer
│   ├── ContractPage.tsx           # Contract interface page
│   └── ExplorerView.tsx (updated) # Added routing for new pages
```

## Usage Examples

### Viewing an Account
1. Click "Block Explorer" in header
2. Click any block
3. Click any transaction
4. Click a from/to address
5. → Account Page opens showing:
   - Address details
   - All transactions
   - Events (if contract)
   - Bytecode (if contract)

### Interacting with a Contract
1. Click "Block Explorer" in header
2. Navigate to transaction involving a known contract
3. Click the contract address
4. → Contract Page opens showing:
   - Contract name and info
   - Read functions (query state)
   - Write functions (execute transactions)
   - Event history
   - Full ABI

### Exploring Proxy Implementation
1. View any proxy contract (Account or Contract page)
2. See "Implementation: 0x..." in header
3. Click external link icon
4. → Navigate to implementation address
5. View implementation bytecode and details

## Testing

To test the new pages:

1. **Deploy contracts** (creates some transactions):
   ```bash
   npx tsx scripts/deploy.ts
   ```

2. **Create some orders** (creates more transactions):
   - Register a manufacturer
   - Deploy a proxy
   - Create orders

3. **Navigate the explorer**:
   - Block Explorer → Blocks → Transactions → Addresses
   - Click various addresses (EOAs, contracts, proxies)
   - Verify correct page type opens
   - Test all tabs and features

4. **Test contract interactions**:
   - Open Contract Page for a known contract
   - Execute read functions
   - Execute write functions (with wallet)
   - View events and transactions

## Future Enhancements

### Phase 1 (MVP) - ✅ Complete
- Account Page with transactions and events
- Contract Page with Read/Write interface
- Navigation between pages
- Event decoding

### Phase 2 (Nice to Have)
- **Search functionality**
  - Search by address, transaction hash, block number
  - Auto-navigate to appropriate page
- **Pagination**
  - Paginate transaction lists
  - Paginate event lists
  - Configurable page size
- **Advanced filtering**
  - Filter transactions by type (sent/received)
  - Filter events by event name
  - Date range filters
- **Performance**
  - Indexed event storage
  - Transaction caching
  - Virtual scrolling for large lists

### Phase 3 (Advanced)
- **Internal transactions**
  - Contract-to-contract calls
  - Trace call tree
- **Token transfers**
  - ERC-20 transfers
  - ERC-721 transfers
- **Contract verification**
  - Upload source code
  - Verify bytecode match
  - Show verified source
- **Analytics**
  - Transaction volume charts
  - Event frequency graphs
  - Top contracts by activity

## Notes

- All addresses are case-insensitive for matching
- Events are decoded best-effort (no error if decode fails)
- Unknown events show "Unknown Event" badge
- Contract Page only works for contracts in our contracts store
- Account Page works for any address (EOA or contract)
- All monetary values displayed in ETH (not Wei)
- Timestamps show relative time ("5m ago", "2h ago")
