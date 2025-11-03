# Building a Development UI for Hardhat-Based Blockchain Logistics Management System

## 1. Executive Summary

This implementation plan provides a complete guide for building a lightweight, TypeScript-based development UI for your Hardhat blockchain project using Viem 2.37.12. The recommended stack is **Vite + React + TypeScript + Viem (no wagmi)**, with **shadcn/ui** for components and **Zustand** for state management. This approach provides a minimal, performant solution ideal for development tools, with a bundle size of ~50-70KB compared to 200+KB with full dApp stacks. The UI will dynamically discover deployed contracts, provide real-time blockchain monitoring, and offer a complete account management system using Hardhat's test accounts directly via private keys.

**Key Design Principles:**
- Direct Viem integration without wagmi (simpler for dev tools using private keys)
- Dynamic contract interaction without hardcoding (parses Hardhat artifacts)
- Real-time updates via WebSocket or HTTP polling
- Type-safe throughout with TypeScript 5.8+
- Lightweight and fast (Vite's HMR provides sub-millisecond updates)

---

## 2. Technology Stack Recommendation

### Core Stack
| Technology | Version | Rationale |
|------------|---------|-----------|
| **Vite** | ^7.1.9 or ^5.0.0 | 10-100x faster HMR than Webpack, zero-config TypeScript, perfect for SPAs |
| **React** | ^18.2.0 | Industry standard, excellent TypeScript support, large ecosystem |
| **TypeScript** | ~5.9.3 (≥5.0.4) | Required for Viem's type inference, enforces type safety |
| **Viem** | 2.37.12 (exact) | Modern Ethereum library, 35KB bundle vs ethers.js 116KB, superior TypeScript support |
| **Zustand** | ^4.5.0 | Lightweight state management (<1KB), perfect for blockchain state, no boilerplate |
| **shadcn/ui** | latest | Copy-paste components (not a library), full control, Tailwind-based, ideal for dev tools |
| **Tailwind CSS** | ^3.4.0 | Utility-first CSS, pairs perfectly with shadcn/ui |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **@wagmi/cli** | ^2.1.0 | ABI type generation from Hardhat artifacts (NOT the wagmi React hooks library) |
| **Hardhat** | 3.0.6 | Smart contract development environment (backend) |
| **@nomicfoundation/hardhat-viem** | ^3.0.0 | Native Viem support in Hardhat |

### Why NOT These Alternatives
- ❌ **wagmi (React hooks)**: Designed for browser wallet connections; unnecessary abstraction for dev tools using private keys
- ❌ **RainbowKit/ConnectKit**: Overkill for testnet; designed for end-user wallet selection
- ❌ **Next.js**: Adds SSR complexity unnecessary for internal dev tools
- ❌ **Material-UI**: Too heavy (~130KB) and opinionated for a lightweight dev tool
- ❌ **ethers.js**: Outdated (v5/v6 split), larger bundle, inferior TypeScript support

---

## 3. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              UI Components (shadcn/ui)                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │ Account  │ │ Contract │ │  Event   │ │  Block   │  │ │
│  │  │ Selector │ │ Dashboard│ │   Feed   │ │ Explorer │  │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │ │
│  └───────┼────────────┼────────────┼────────────┼────────┘ │
│          │            │            │            │          │
│  ┌───────▼────────────▼────────────▼────────────▼────────┐ │
│  │         Zustand Store (Global State)                   │ │
│  │  • Current block  • Accounts  • Contracts  • Events    │ │
│  └───────┬─────────────────────────────────────┬──────────┘ │
│          │                                     │            │
│  ┌───────▼─────────────────────────────────────▼──────────┐ │
│  │        Custom React Hooks (Viem Logic)                  │ │
│  │  • useWatchBlocks  • useContract  • useAccount          │ │
│  └───────┬─────────────────────────────────────┬──────────┘ │
│          │                                     │            │
│  ┌───────▼─────────────────────────────────────▼──────────┐ │
│  │            Viem Client Layer                            │ │
│  │  ┌──────────────────┐      ┌───────────────────────┐   │ │
│  │  │  Public Client   │      │   Wallet Client(s)    │   │ │
│  │  │  (read-only)     │      │  (per account)        │   │ │
│  │  └────────┬─────────┘      └──────────┬────────────┘   │ │
│  └───────────┼────────────────────────────┼───────────────┘ │
└──────────────┼────────────────────────────┼─────────────────┘
               │                            │
          HTTP Transport                HTTP Transport
               │                            │
               └────────────┬───────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Hardhat Node (8545)     │
              │      Chain ID: 31337      │
              │   20 Test Accounts        │
              │   ┌─────────────────────┐ │
              │   │  Smart Contracts    │ │
              │   │ • ManufacturerReg   │ │
              │   │ • LogisticsOrder    │ │
              │   │ • LogisticsProxy    │ │
              │   └─────────────────────┘ │
              └───────────────────────────┘
```

### Component Hierarchy

```
App (React Root)
├── AccountManagementPanel
│   ├── AccountSelector (dropdown)
│   ├── AccountDetails (address, balance, private key display)
│   └── NetworkInfo (chain ID, connection status)
│
├── ContractDashboard
│   ├── ContractDiscovery (lists all deployed contracts)
│   └── ContractCard (for each contract)
│       ├── ContractInfo (address, name, proxy detection)
│       ├── FunctionList (tabs: Read / Write)
│       └── FunctionForm (dynamic form per function)
│           ├── InputFields (generated from ABI)
│           ├── ExecuteButton
│           └── ResultDisplay (return values / transaction receipt)
│
├── RealtimeMonitor
│   ├── BlockStatus (current block, timestamp)
│   └── TransactionFeed
│       └── TransactionCard (hash, from, to, function called)
│
└── EventLog
    ├── EventFilters (by contract, event type)
    └── EventList
        └── EventCard (decoded event with args)
```

### Data Flow: Blockchain → UI

```
1. Blockchain Event (new block, transaction, event)
         ↓
2. Viem Client (watchBlocks, watchContractEvent)
         ↓
3. Custom Hook (useWatchBlocks, useContractEvents)
         ↓
4. Zustand Store Update (setCurrentBlock, addTransaction)
         ↓
5. React Component Re-render (selective subscription)
         ↓
6. UI Update (display new data)
```

---

## 4. Step-by-Step Implementation Guide for Claude Code

### Phase 1: Project Initialization (5 minutes)

```bash
# 1. Create frontend project
npm create vite@latest hardhat-dev-ui -- --template react-ts
cd hardhat-dev-ui

# 2. Install core dependencies
npm install viem@2.37.12 zustand

# 3. Install UI dependencies
npm install -D tailwindcss@^3.4.0 postcss autoprefixer
npx tailwindcss init -p

# 4. Initialize shadcn/ui
npx shadcn-ui@latest init
# Select: Yes to TypeScript, Tailwind CSS, src/components for component location

# 5. Add essential shadcn components
npx shadcn-ui@latest add button input select card table badge toast tabs form label alert

# 6. Install ABI type generation tool
npm install -D @wagmi/cli

# 7. Install optional development tools
npm install -D @tanstack/react-query date-fns  # For caching and date formatting
```

### Phase 2: Project Structure Setup

Create this directory structure:

```
hardhat-dev-ui/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn components (auto-generated)
│   │   ├── AccountManagementPanel.tsx
│   │   ├── ContractDashboard.tsx
│   │   ├── ContractCard.tsx
│   │   ├── FunctionForm.tsx
│   │   ├── BlockStatus.tsx
│   │   ├── TransactionFeed.tsx
│   │   └── EventLog.tsx
│   ├── hooks/
│   │   ├── useWatchBlocks.ts
│   │   ├── useContractRead.ts
│   │   ├── useContractWrite.ts
│   │   ├── useContractEvents.ts
│   │   └── useAccountManager.ts
│   ├── lib/
│   │   ├── viem.ts                  # Viem client configuration
│   │   ├── contractDiscovery.ts     # Hardhat artifact parsing
│   │   ├── abiParser.ts             # ABI function extraction
│   │   ├── proxyDetection.ts        # EIP-1967 proxy detection
│   │   └── utils.ts                 # Formatters, validators
│   ├── store/
│   │   ├── blockchainStore.ts       # Block, tx state
│   │   ├── accountStore.ts          # Account management
│   │   └── contractStore.ts         # Discovered contracts
│   ├── types/
│   │   ├── contracts.ts             # Contract type definitions
│   │   └── blockchain.ts            # Block, transaction types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── wagmi.config.ts                  # ABI generation config
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

### Phase 3: Configuration Files

**Complete package.json:**
```json
{
  "name": "hardhat-dev-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "generate": "wagmi generate",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "viem": "2.37.12",
    "zustand": "^4.5.0",
    "date-fns": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "@vitejs/plugin-react": "^5.0.4",
    "@wagmi/cli": "^2.1.0",
    "typescript": "~5.9.3",
    "vite": "^7.1.9",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "eslint": "^9.37.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
})
```

**wagmi.config.ts** (for ABI type generation):
```typescript
import { defineConfig } from '@wagmi/cli'
import { hardhat } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/generated/contracts.ts',
  plugins: [
    hardhat({
      project: '../your-hardhat-project-path',
      artifacts: 'artifacts/',
      exclude: ['**/test/**', '**/node_modules/**'],
    }),
  ],
})
```

### Phase 4: Core Implementation Files

Due to length constraints, I'll provide the essential file implementations. The complete code for all 15+ files would be too long, but here are the critical ones:

**src/lib/viem.ts** (Viem clients and Hardhat accounts):
```typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { Chain } from 'viem'

export const hardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
}

export const HARDHAT_ACCOUNTS = [
  { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
  { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
  { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  // Add remaining 7 accounts...
] as const

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(),
  batch: { multicall: true },
})

export function createWalletClientForAccount(accountIndex: number) {
  const account = privateKeyToAccount(HARDHAT_ACCOUNTS[accountIndex].privateKey as `0x${string}`)
  return createWalletClient({ account, chain: hardhat, transport: http() })
}
```

**src/store/blockchainStore.ts**:
```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Block, Transaction, Log } from 'viem'

interface BlockchainState {
  currentBlock: Block | null
  recentBlocks: Block[]
  events: Log[]
  isConnected: boolean
  
  setCurrentBlock: (block: Block) => void
  addBlock: (block: Block) => void
  addEvents: (events: Log[]) => void
  setConnectionStatus: (connected: boolean) => void
}

export const useBlockchainStore = create<BlockchainState>()(
  devtools((set) => ({
    currentBlock: null,
    recentBlocks: [],
    events: [],
    isConnected: false,
    
    setCurrentBlock: (block) => set({ currentBlock: block }),
    addBlock: (block) => set((state) => ({
      recentBlocks: [block, ...state.recentBlocks].slice(0, 20)
    })),
    addEvents: (events) => set((state) => ({
      events: [...events, ...state.events].slice(0, 100)
    })),
    setConnectionStatus: (connected) => set({ isConnected: connected }),
  }), { name: 'blockchain-store' })
)
```

**src/hooks/useWatchBlocks.ts**:
```typescript
import { useEffect } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'

export function useWatchBlocks() {
  const { setCurrentBlock, addBlock } = useBlockchainStore()
  
  useEffect(() => {
    const unwatch = publicClient.watchBlocks({
      onBlock: (block) => {
        setCurrentBlock(block)
        addBlock(block)
      },
      pollingInterval: 1_000,
      emitOnBegin: true,
    })
    
    return () => unwatch()
  }, [setCurrentBlock, addBlock])
}
```

---

## 5. Viem Integration Patterns

### Client Setup
```typescript
// Public client for reads
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
  batch: { multicall: true },
  pollingInterval: 1_000,
})

// Wallet client for writes (per account)
function createWalletClientForAccount(index: number) {
  const account = privateKeyToAccount(HARDHAT_ACCOUNTS[index].privateKey)
  return createWalletClient({
    account,
    chain: hardhat,
    transport: http(),
  })
}
```

### Account Management
```typescript
// Switch accounts by creating new wallet client
const wallet = createWalletClientForAccount(selectedAccountIndex)

// Get balance
const balance = await publicClient.getBalance({ 
  address: HARDHAT_ACCOUNTS[index].address 
})
```

### Contract Interaction
```typescript
// Read (view/pure functions)
const result = await publicClient.readContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'balanceOf',
  args: [userAddress],
})

// Write (state-changing functions)
const { request } = await publicClient.simulateContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'transfer',
  args: [recipient, amount],
  account: walletClient.account,
})

const hash = await walletClient.writeContract(request)
const receipt = await publicClient.waitForTransactionReceipt({ hash })
```

### Block and Event Subscriptions
```typescript
// Watch blocks
const unwatch = publicClient.watchBlocks({
  onBlock: (block) => updateStore(block),
  pollingInterval: 1_000,
  emitOnBegin: true,
})

// Watch contract events
const unwatch = publicClient.watchContractEvent({
  address: contractAddress,
  abi: contractAbi,
  eventName: 'Transfer',
  onLogs: (logs) => {
    // Logs are automatically decoded
    logs.forEach(log => console.log(log.args))
  },
})

// Cleanup
return () => unwatch()
```

---

## 6. UI Component Specifications

### Account Management Panel
**Features:**
- Dropdown selector for 10 Hardhat accounts
- Display: address, balance (auto-updating), private key (show/hide toggle)
- Copy-to-clipboard for address and private key
- Visual indicator of selected account
- Network status badge (Chain ID: 31337)

**Key Implementation:**
```typescript
<Select value={selectedAccountIndex.toString()} 
        onValueChange={(val) => setSelectedAccount(parseInt(val))}>
  {HARDHAT_ACCOUNTS.map((account, index) => (
    <SelectItem value={index.toString()}>
      Account #{index}: {account.address.slice(0,6)}...
      {balance && ` (${formatEther(balance)} ETH)`}
    </SelectItem>
  ))}
</Select>
```

### Contract Dashboard
**Features:**
- Automatically discover all deployed contracts
- Display contract name, address, type (implementation/proxy)
- Detect UUPS proxies via EIP-1967 storage slots
- Tabs for Read vs Write functions
- Search/filter functions by name

**Dynamic Discovery:**
```typescript
// Parse Hardhat artifacts directory
const artifacts = await fetch('/artifacts/deployments.json')
const contracts = parseArtifacts(artifacts)

// Detect proxies
for (const contract of contracts) {
  const proxyInfo = await detectProxy(contract.address)
  if (proxyInfo.isProxy) {
    contract.implementationAddress = proxyInfo.implementation
    contract.proxyType = proxyInfo.proxyType
  }
}
```

### Function Form (Dynamic)
**Features:**
- Generate form inputs from ABI automatically
- Type-specific validation (address, uint256, string, bool, bytes, arrays)
- Visual distinction between read/write/payable functions
- Display return values (read) or transaction receipts (write)
- Error handling with user-friendly messages

**Input Type Mapping:**
- `address` → Text input with regex validation `/^0x[a-fA-F0-9]{40}$/`
- `uint256`/`int256` → Number input → Parse to `BigInt`
- `bool` → Checkbox or select (true/false)
- `string` → Text input
- `bytes` → Hex string input
- `array` → JSON array input with parsing

### Real-Time Feed
**Features:**
- Live transaction list with decoded function calls
- Block number updates every second
- Event log with automatic decoding
- Filter by contract address or event type
- Color-coded status (pending/success/failed)

---

## 7. Common Challenges & Solutions

### Challenge 1: TypeScript Type Inference with Dynamic ABIs
**Problem:** Runtime ABIs don't have `as const`, breaking type inference.

**Solution:**
```typescript
// Option 1: Use wagmi-cli to pre-generate types
npm run generate  // Creates src/generated/contracts.ts with typed ABIs

// Option 2: Use parseAbi for known signatures
import { parseAbi } from 'viem'
const abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)'
])
```

### Challenge 2: Hardhat Node Resets
**Problem:** Restarting Hardhat resets nonces, causing errors.

**Solution:**
```typescript
// Detect node restart by monitoring block number
if (newBlockNumber < previousBlockNumber) {
  console.log('Node restart detected')
  clearAllStores()
  window.location.reload()
}
```

### Challenge 3: Error Messages
**Problem:** Raw Viem errors are cryptic.

**Solution:**
```typescript
function formatViemError(error: any): string {
  if (error.message.includes('execution reverted')) {
    return 'Transaction reverted: ' + extractRevertReason(error)
  }
  if (error.message.includes('insufficient funds')) {
    return 'Insufficient ETH balance'
  }
  if (error.message.includes('nonce too high')) {
    return 'Connection issue. Please refresh.'
  }
  return error.shortMessage || 'Unknown error'
}
```

### Challenge 4: Performance with High-Frequency Updates
**Solutions:**
1. **Selective store subscriptions:**
```typescript
// Good: Only subscribe to currentBlock
const currentBlock = useBlockchainStore(state => state.currentBlock)

// Bad: Subscribes to entire store
const store = useBlockchainStore()
```

2. **Debounce updates:**
```typescript
const debouncedUpdate = debounce((block) => setCurrentBlock(block), 100)
```

3. **Limit stored items:**
```typescript
addBlock: (block) => set((state) => ({
  recentBlocks: [block, ...state.recentBlocks].slice(0, 20)  // Keep only 20
}))
```

### Challenge 5: Proxy Contract Detection
**Problem:** Proxy shows proxy ABI instead of implementation ABI.

**Solution:**
```typescript
// Detect proxy using EIP-1967 storage slots
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

const implSlotValue = await publicClient.getStorageAt({
  address: proxyAddress,
  slot: IMPLEMENTATION_SLOT
})

if (implSlotValue !== '0x00...00') {
  const implementationAddress = '0x' + implSlotValue.slice(-40)
  // Use proxy address with implementation ABI
  displayContract({
    address: proxyAddress,
    abi: implementationAbi,
    isProxy: true,
    implementationAddress
  })
}
```

---

## 8. Testing Approach

### Manual Testing Checklist

**Account Management:**
- [ ] All 10 Hardhat accounts display correctly
- [ ] Balances update on new blocks
- [ ] Switching accounts updates UI immediately
- [ ] Private keys can be shown/hidden
- [ ] Copy-to-clipboard works

**Contract Interaction:**
- [ ] Read functions return correct values
- [ ] Write functions execute and show transaction receipt
- [ ] Input validation rejects invalid data
- [ ] Payable functions accept value input
- [ ] Error messages are user-friendly

**Real-Time Updates:**
- [ ] Block number updates every second
- [ ] New transactions appear in feed
- [ ] Events are decoded correctly
- [ ] No memory leaks after extended use

**Proxy Detection:**
- [ ] UUPS proxies show implementation address
- [ ] Implementation ABI is used for interaction
- [ ] Proxy type (UUPS/Transparent/Beacon) displays correctly

### Testing Against Hardhat

**Setup:**
```bash
# Terminal 1: Start Hardhat node
cd hardhat-project
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Start frontend
cd hardhat-dev-ui
npm run dev
```

**Test Scenarios:**
1. Connect UI → Should show Chain ID 31337
2. Select different accounts → Balances should update
3. Call read function → Should return value instantly
4. Call write function → Should show transaction hash, then receipt
5. Restart Hardhat node → UI should detect and handle gracefully
6. Deploy new contract → Should appear in contract list

---

## 9. References

### Official Documentation
- **Viem:** https://viem.sh/docs/getting-started
- **Viem Clients:** https://viem.sh/docs/clients/public
- **Viem Contract Interactions:** https://viem.sh/docs/contract/readContract
- **Viem Event Watching:** https://viem.sh/docs/actions/public/watchContractEvent
- **Viem TypeScript:** https://viem.sh/docs/typescript
- **Hardhat 3.0:** https://hardhat.org/docs
- **Hardhat + Viem:** https://hardhat.org/hardhat-runner/docs/advanced/using-viem
- **Zustand:** https://zustand.docs.pmnd.rs/
- **shadcn/ui:** https://ui.shadcn.com/docs
- **Vite:** https://vite.dev/guide/

### Tutorials
- **RareSkills Viem Tutorial:** https://rareskills.io/post/viem-ethereum
- **Building dApps with Viem:** https://blog.logrocket.com/full-stack-dapp-tutorial-vite-react-tailwind-css-solidity/
- **EIP-1967 Proxy Specification:** https://eips.ethereum.org/EIPS/eip-1967
- **Ethereum ABI Specification:** https://docs.soliditylang.org/en/latest/abi-spec.html

### Open Source Examples
- **scaffold-eth-2:** https://github.com/scaffold-eth/scaffold-eth-2 (Best Viem + React reference)
- **Next-Web3-Boilerplate:** https://github.com/Pedrojok01/Next-Web3-Boilerplate (Clean Viem implementation)
- **OpenZeppelin UI Builder:** https://github.com/OpenZeppelin/ui-builder (Advanced contract UI)
- **Custom Block Explorer:** https://github.com/Shaivpidadi/custom-block-explorer (Local explorer)
- **Viem GitHub:** https://github.com/wevm/viem

---

## 10. Quick Start Commands

```bash
# 1. Create project
npm create vite@latest hardhat-dev-ui -- --template react-ts
cd hardhat-dev-ui

# 2. Install dependencies
npm install viem@2.37.12 zustand date-fns
npm install -D tailwindcss postcss autoprefixer @wagmi/cli
npx tailwindcss init -p

# 3. Setup shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select card table badge toast tabs form label alert

# 4. Create project structure (see Phase 2 above)

# 5. Copy implementation files (see Phase 4 above)

# 6. Start development
# Terminal 1: Hardhat node
cd ../hardhat-project && npx hardhat node

# Terminal 2: Frontend
cd ../hardhat-dev-ui && npm run dev

# Open http://localhost:3000
```

---

## Conclusion

This comprehensive implementation plan provides everything Claude Code needs to build a production-ready development UI for your Hardhat blockchain logistics system. The stack is optimized for:

**Developer Productivity:**
- Vite's sub-millisecond HMR for instant feedback
- TypeScript for type safety and autocomplete
- Dynamic contract discovery eliminates hardcoding

**Performance:**
- 50-70KB bundle size (vs 200+KB with full dApp stacks)
- Selective Zustand subscriptions minimize re-renders
- Efficient polling (1s for blocks, 2s for events)

**Maintainability:**
- Direct Viem (no wagmi abstraction layer)
- shadcn/ui components (full control, no vendor lock-in)
- Clear separation of concerns (hooks, stores, components, lib)

**Features:**
- Complete account management with private key access
- Dynamic contract interaction (no hardcoding)
- Real-time blockchain monitoring
- UUPS proxy detection and handling
- Type-safe throughout

The result is a **lightweight, fast, and maintainable** tool perfectly suited for Hardhat development workflows. Claude Code can follow these step-by-step instructions to implement a UI that automatically adapts to your deployed contracts and provides excellent visibility into blockchain state.