# Vercel Deployment Roadmap
## Logistics NFT Frontend - Production Deployment Plan

**Version**: 1.0
**Created**: 2025-10-30
**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours

---

## 📋 Executive Summary

This roadmap outlines the complete process for deploying the Logistics NFT frontend to Vercel, transitioning from hardcoded configuration to a production-ready, environment-driven architecture. The deployment separates frontend hosting from blockchain infrastructure, reducing memory pressure on Besu nodes and providing better UX through CDN, auto-SSL, and CI/CD.

### Key Benefits
- ✅ **Zero Infrastructure Cost** - Free Vercel tier + Free OCI tier
- ✅ **Automatic HTTPS** - SSL certificates managed by Vercel
- ✅ **Global CDN** - Fast load times worldwide
- ✅ **CI/CD Pipeline** - Auto-deploy on git push
- ✅ **Zero Memory Impact** - No frontend overhead on Besu nodes
- ✅ **Environment Management** - Easy config updates without rebuilds
- ✅ **Better Architecture** - Separation of concerns

---

## 🎯 Deployment Goals

### Primary Goals
1. Deploy frontend to Vercel with automatic HTTPS
2. Connect to Oracle Cloud Besu RPC (130.162.61.132:8545)
3. Enable environment-based configuration
4. Maintain support for local development
5. Zero downtime for smart contracts (already deployed)

### Success Criteria
- [ ] Frontend accessible via HTTPS URL (e.g., `https://logistics-nft.vercel.app`)
- [ ] Successfully connects to Besu Cloud RPC endpoint
- [ ] Can read contract data (manufacturer registry, orders)
- [ ] Can write transactions (create orders, update states)
- [ ] Local development still works (`npm run dev`)
- [ ] Automatic deployments on git push

---

## 📊 Current State Analysis

### ✅ What's Working
- Frontend built and tested locally
- UUPS proxy pattern correctly implemented
- Factory pattern support
- Multi-chain detection (Hardhat/Besu Local/Cloud)
- CORS already enabled on Besu RPC (`--rpc-http-cors-origins=*`)
- Smart contracts deployed to cloud

### ⚠️ Issues to Fix
1. **Hardcoded RPC URL** - Old IP (92.5.56.222) instead of new (130.162.61.132)
2. **No Environment Variables** - All config hardcoded in source
3. **Static Deployment Info** - Contract addresses in JSON files
4. **No Build Configuration** - No Vercel or environment setup
5. **Missing Production Optimizations** - No caching, error boundaries, or monitoring

### 🔍 Current Architecture
```
┌─────────────────────────────────────┐
│    Frontend (Local Dev Server)     │
│         localhost:3000              │
│  - Vite dev server                  │
│  - Hardcoded configs                │
│  - Direct RPC connection            │
└─────────────────┬───────────────────┘
                  │
                  │ HTTP (no SSL)
                  ▼
┌─────────────────────────────────────┐
│   Oracle Cloud Instance 1           │
│   92.5.56.222:8545 (OLD IP)         │
│  ┌──────────────────────────────┐   │
│  │  Besu Node 0 (RPC + P2P)     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🏗️ Target Architecture

```
┌─────────────────────────────────────┐
│         Vercel CDN (Global)         │
│   https://logistics-nft.vercel.app  │
│  ┌──────────────────────────────┐   │
│  │  Frontend (Static Build)     │   │
│  │  - React + Viem              │   │
│  │  - Auto SSL/TLS              │   │
│  │  - Edge caching              │   │
│  └──────────────────────────────┘   │
└─────────────────┬───────────────────┘
                  │
                  │ HTTPS with CORS
                  ▼
┌─────────────────────────────────────┐
│   Oracle Cloud Instance 1           │
│   130.162.61.132:8545 (NEW IP)      │
│  ┌──────────────────────────────┐   │
│  │  Besu Node 0                 │   │
│  │  - RPC: 0.0.0.0:8545         │   │
│  │  - CORS: * (already enabled) │   │
│  │  - APIs: ETH,NET,WEB3,QBFT   │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  API Server (Optional)       │   │
│  │  - Port 3001                 │   │
│  │  - Contract addresses        │   │
│  │  - ABIs                      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 📝 Implementation Phases

## Phase 1: Preparation & Configuration (30 min)

### 1.1 Update RPC Endpoints
**Priority**: Critical
**Files**: `frontend/src/lib/viem.ts`

**Changes**:
```typescript
// OLD (line 30)
export const besuCloud: Chain = {
  rpcUrls: {
    default: { http: ['http://92.5.56.222:8545'] }
  }
}

// NEW
export const besuCloud: Chain = {
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_BESU_CLOUD_RPC || 'http://130.162.61.132:8545']
    }
  }
}
```

**Also update** (line 62):
```typescript
// OLD
const cloudClient = createPublicClient({
  transport: http('http://92.5.56.222:8545', { timeout: 3000 }),
})

// NEW
const cloudClient = createPublicClient({
  transport: http(
    import.meta.env.VITE_BESU_CLOUD_RPC || 'http://130.162.61.132:8545',
    { timeout: 3000 }
  ),
})
```

### 1.2 Create Environment Configuration Files
**Files to create**:

**`.env.development`** (local development):
```bash
# Local Development Environment
VITE_BESU_CLOUD_RPC=http://127.0.0.1:8545
VITE_DEPLOYMENT_SOURCE=local
VITE_ENABLE_DEBUG=true
```

**`.env.production`** (Vercel production):
```bash
# Production Environment (Vercel)
VITE_BESU_CLOUD_RPC=http://130.162.61.132:8545
VITE_DEPLOYMENT_SOURCE=remote
VITE_ENABLE_DEBUG=false
```

**`.env.example`** (template for developers):
```bash
# Environment Configuration Template
# Copy to .env.development or .env.production

# Besu Cloud RPC endpoint
VITE_BESU_CLOUD_RPC=http://130.162.61.132:8545

# Deployment info source (local/remote)
VITE_DEPLOYMENT_SOURCE=remote

# Enable debug logging
VITE_ENABLE_DEBUG=false

# Optional: API server endpoint for contract addresses
# VITE_API_ENDPOINT=http://130.162.61.132:3001
```

**Update `.gitignore`**:
```bash
# Environment files
.env
.env.local
.env.development.local
.env.production.local

# Keep templates
!.env.example
!.env.development
!.env.production
```

### 1.3 Create Vercel Configuration
**File**: `frontend/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/artifacts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300"
        }
      ]
    }
  ],
  "env": {
    "VITE_BESU_CLOUD_RPC": "@vite-besu-cloud-rpc",
    "VITE_DEPLOYMENT_SOURCE": "remote"
  }
}
```

### 1.4 Update Deployment Info Files
**File**: `frontend/public/deployment-info.json`

```json
{
  "network": "besu-cloud",
  "chainId": 10001,
  "rpcUrl": "http://130.162.61.132:8545",
  "deployer": "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
  "contracts": {
    "ManufacturerRegistry": "0x42699a7612a82f1d9c36148af9c77354759b210b",
    "LogisticsOrderImplementationV1": "0xa50a51c09a5c451c52bb714527e1974b686d8e77",
    "LogisticsOrderProxy": "0x9a3dbca554e9f6b9257aaa24010da8377c57c17e"
  },
  "version": "1.0.0",
  "timestamp": "2025-10-30T07:53:30.201Z",
  "updated": "2025-10-30T12:00:00.000Z"
}
```

---

## Phase 2: Code Refactoring (45 min)

### 2.1 Create Configuration Module
**New file**: `frontend/src/config/env.ts`

```typescript
/**
 * Environment Configuration
 * Centralized environment variable management
 */

export const ENV = {
  // Blockchain RPC endpoints
  besuCloudRpc: import.meta.env.VITE_BESU_CLOUD_RPC || 'http://130.162.61.132:8545',
  besuLocalRpc: import.meta.env.VITE_BESU_LOCAL_RPC || 'http://127.0.0.1:8545',

  // Deployment source (local files vs remote API)
  deploymentSource: import.meta.env.VITE_DEPLOYMENT_SOURCE || 'local',

  // API endpoint (optional, for future use)
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT,

  // Debug mode
  debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const

// Type-safe environment validation
export function validateEnv() {
  const required = ['besuCloudRpc']
  const missing = required.filter(key => !ENV[key as keyof typeof ENV])

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`)
  }

  if (ENV.debug) {
    console.log('🔧 Environment Configuration:', ENV)
  }
}

// Run validation on import
validateEnv()
```

### 2.2 Update viem.ts to Use ENV
**File**: `frontend/src/lib/viem.ts`

```typescript
import { ENV } from '@/config/env'

export const besuCloud: Chain = {
  id: 10001,
  name: 'Besu Cloud',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: [ENV.besuCloudRpc] },
  },
  testnet: true,
}

export const besuLocal: Chain = {
  id: 10001,
  name: 'Besu Local',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: [ENV.besuLocalRpc] },
  },
  testnet: true,
}

// Update detectChain function
async function detectChain(): Promise<Chain> {
  // Try cloud first
  try {
    const cloudClient = createPublicClient({
      transport: http(ENV.besuCloudRpc, { timeout: 3000 }),
    })
    const chainId = await cloudClient.getChainId()
    if (chainId === 10001) {
      console.log('🔗 Detected Besu Cloud chain (10001)')
      return besuCloud
    }
  } catch (e) {
    console.log('☁️ Cloud network not available, trying local...')
  }

  // Try local
  try {
    const client = createPublicClient({
      transport: http(ENV.besuLocalRpc, { timeout: 2000 }),
    })
    const chainId = await client.getChainId()

    if (chainId === 10001) {
      console.log('🔗 Detected Besu Local chain (10001)')
      return besuLocal
    } else if (chainId === 31337) {
      console.log('🔗 Detected Hardhat chain (31337)')
      return hardhat
    } else {
      console.warn(`⚠️ Unknown chain ID: ${chainId}, defaulting to Besu Cloud`)
      return besuCloud
    }
  } catch (e) {
    console.warn('⚠️ Chain detection failed, defaulting to Besu Cloud')
    return besuCloud
  }
}
```

### 2.3 Add Error Boundaries
**New file**: `frontend/src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 2.4 Update Main App Entry
**File**: `frontend/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Log environment on startup
console.log('🚀 Logistics NFT Frontend')
console.log('📦 Version:', import.meta.env.VITE_APP_VERSION || '1.0.0')
console.log('🌍 Environment:', import.meta.env.MODE)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
```

### 2.5 Add Loading States
**New file**: `frontend/src/components/LoadingSpinner.tsx`

```typescript
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
```

---

## Phase 3: Testing & Verification (30 min)

### 3.1 Local Build Test
```bash
# 1. Clean install
cd frontend
rm -rf node_modules dist
npm install

# 2. Test development build
npm run dev
# ✓ Should connect to local or cloud RPC
# ✓ Verify contract data loads
# ✓ Check console for errors

# 3. Test production build
npm run build
# ✓ Should complete without errors
# ✓ Check dist/ directory created
# ✓ Verify artifacts copied

# 4. Preview production build
npm run preview
# ✓ Should run on port 4173
# ✓ Test all functionality
```

### 3.2 Verify Cloud RPC Connection
```bash
# Test RPC endpoint directly
curl -X POST http://130.162.61.132:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_chainId",
    "params":[],
    "id":1
  }'

# Expected response:
# {"jsonrpc":"2.0","id":1,"result":"0x2711"}  (10001 in hex)
```

### 3.3 Pre-Deployment Checklist
- [ ] All environment variables defined in `.env.production`
- [ ] RPC endpoint updated to new IP (130.162.61.132)
- [ ] Deployment info JSON files updated
- [ ] Build completes successfully (`npm run build`)
- [ ] Preview works locally (`npm run preview`)
- [ ] Console shows no errors
- [ ] Contract data loads correctly
- [ ] Transactions can be sent (test on local first)

---

## Phase 4: Vercel Deployment (30 min)

### 4.1 Create Vercel Account & Project
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account (recommended)
3. Install Vercel GitHub app
4. Grant access to `logistics_prototype` repository

### 4.2 Import Project
1. Click "Add New Project"
2. Select `logistics_prototype` repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4.3 Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_BESU_CLOUD_RPC` | `http://130.162.61.132:8545` | Production |
| `VITE_DEPLOYMENT_SOURCE` | `remote` | Production |
| `VITE_ENABLE_DEBUG` | `false` | Production |
| `VITE_BESU_LOCAL_RPC` | `http://127.0.0.1:8545` | Development |
| `VITE_ENABLE_DEBUG` | `true` | Development |

### 4.4 Deploy
1. Click "Deploy"
2. Wait for build to complete (~2-3 min)
3. Vercel will provide deployment URL: `https://logistics-nft.vercel.app`

### 4.5 Configure Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate auto-provisioned

---

## Phase 5: Post-Deployment Verification (20 min)

### 5.1 Functional Testing
**Test on**: `https://logistics-nft.vercel.app`

- [ ] **Page loads** - No 404 or build errors
- [ ] **Chain detection** - Connects to Besu Cloud (10001)
- [ ] **Contract loading** - All contracts appear in dashboard
- [ ] **Read operations** - Can view manufacturer registry, orders
- [ ] **Wallet connection** - Accounts switch properly
- [ ] **Block monitoring** - Real-time blocks appear
- [ ] **Event logs** - Events display correctly

### 5.2 Write Transaction Test
- [ ] Select a registered manufacturer account
- [ ] Create a new order
- [ ] Verify transaction sent to Besu Cloud
- [ ] Check order appears in contract dashboard
- [ ] Update order state
- [ ] Verify state change reflected

### 5.3 Performance Testing
- [ ] Lighthouse score (aim for 90+ performance)
- [ ] Time to Interactive < 3s
- [ ] First Contentful Paint < 1.5s
- [ ] No console errors
- [ ] HTTPS certificate valid

### 5.4 Cross-Browser Testing
- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (Mobile - iOS)

---

## Phase 6: CI/CD Setup (15 min)

### 6.1 Automatic Deployments
Vercel automatically deploys on:
- **Production**: Pushes to `main` branch → `https://logistics-nft.vercel.app`
- **Preview**: Pull requests → `https://logistics-nft-<pr-id>.vercel.app`
- **Branch**: Other branches → `https://logistics-nft-<branch>.vercel.app`

### 6.2 Configure GitHub Integration
In Vercel Settings → Git:
- [x] Enable automatic deployments
- [x] Enable preview deployments for PRs
- [x] Enable comments on PRs with deployment URLs
- [ ] Configure production branch (default: `main`)

### 6.3 Deployment Notifications
Configure notifications in Vercel → Settings → Notifications:
- [ ] Email notifications for failed builds
- [ ] Slack integration (optional)
- [ ] Discord webhook (optional)

---

## Phase 7: Monitoring & Optimization (Ongoing)

### 7.1 Add Analytics
**File**: `frontend/src/lib/analytics.ts`

```typescript
// Simple event tracking (Vercel Analytics or custom)
export function trackEvent(event: string, data?: Record<string, unknown>) {
  if (import.meta.env.PROD) {
    console.log('📊 Track:', event, data)
    // Add Vercel Analytics, Google Analytics, or custom
  }
}

// Track blockchain interactions
export function trackTransaction(type: string, hash: string) {
  trackEvent('transaction', { type, hash })
}

export function trackError(error: Error, context?: string) {
  trackEvent('error', { message: error.message, context })
}
```

### 7.2 Performance Monitoring
Add to `frontend/src/main.tsx`:

```typescript
// Log Web Vitals
if (import.meta.env.PROD) {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log)
    getFID(console.log)
    getFCP(console.log)
    getLCP(console.log)
    getTTFB(console.log)
  })
}
```

### 7.3 Error Tracking
Consider integrating:
- **Sentry**: Automatic error tracking
- **LogRocket**: Session replay for debugging
- **Vercel Analytics**: Built-in analytics

### 7.4 Caching Strategy
Already configured in `vercel.json`:
- Artifacts: 1 year cache (immutable)
- JSON files: 5 minute cache (fresh deployment info)
- Static assets: Auto-cached by Vercel CDN

---

## 🔧 Optional Enhancements

### Enhancement 1: Dynamic Contract Loading
**Problem**: Contract addresses hardcoded in JSON files
**Solution**: API endpoint for contract addresses

**Create**: `frontend/src/services/contractRegistry.ts`

```typescript
import { ENV } from '@/config/env'

interface ContractRegistry {
  network: string
  chainId: number
  contracts: Record<string, string>
  timestamp: string
}

export async function loadContractRegistry(): Promise<ContractRegistry> {
  // Option 1: Load from API (future)
  if (ENV.apiEndpoint) {
    const response = await fetch(`${ENV.apiEndpoint}/api/v1/contracts`)
    return response.json()
  }

  // Option 2: Load from static JSON (current)
  const response = await fetch('/deployment-info.json')
  return response.json()
}
```

### Enhancement 2: Network Status Indicator
**New component**: `frontend/src/components/NetworkStatus.tsx`

```typescript
import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'

export function NetworkStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const block = await publicClient.getBlockNumber()
        setBlockNumber(block)
        setStatus('online')
      } catch {
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${
        status === 'online' ? 'bg-green-500' :
        status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
      }`} />
      <span className="text-sm">
        {status === 'online' ? `Block ${blockNumber}` :
         status === 'offline' ? 'Offline' : 'Connecting...'}
      </span>
    </div>
  )
}
```

### Enhancement 3: PWA Support
Install workbox:
```bash
npm install -D vite-plugin-pwa
```

Update `vite.config.ts`:
```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Logistics NFT Tracker',
        short_name: 'LogisticsNFT',
        theme_color: '#3B82F6',
        icons: [/* ... */]
      }
    })
  ]
})
```

---

## 📋 Complete Implementation Checklist

### Pre-Deployment Tasks
- [ ] Update RPC endpoints in `viem.ts` (new IP: 130.162.61.132)
- [ ] Create `.env.development` file
- [ ] Create `.env.production` file
- [ ] Create `.env.example` file
- [ ] Create `vercel.json` configuration
- [ ] Update `.gitignore` for env files
- [ ] Create `config/env.ts` module
- [ ] Refactor `viem.ts` to use ENV config
- [ ] Add ErrorBoundary component
- [ ] Add LoadingSpinner component
- [ ] Update deployment-info.json with new IP
- [ ] Run `npm install` (ensure all deps installed)
- [ ] Test local development build (`npm run dev`)
- [ ] Test production build (`npm run build`)
- [ ] Test production preview (`npm run preview`)
- [ ] Verify RPC endpoint connectivity (curl test)

### Vercel Setup Tasks
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Import project to Vercel
- [ ] Configure build settings (Vite, frontend/ root)
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy to production
- [ ] Verify deployment URL works
- [ ] Test HTTPS certificate

### Post-Deployment Verification
- [ ] Frontend loads without errors
- [ ] Chain detection works (connects to Besu Cloud)
- [ ] Contracts load successfully
- [ ] Can read contract data
- [ ] Can send transactions
- [ ] Real-time block updates work
- [ ] Events display correctly
- [ ] All views functional (Dashboard, Explorer, Validators)
- [ ] Mobile responsive
- [ ] Cross-browser compatible
- [ ] Performance metrics acceptable (Lighthouse)

### CI/CD Configuration
- [ ] Automatic deployments enabled
- [ ] Preview deployments for PRs enabled
- [ ] Production branch configured (main)
- [ ] Build notifications configured
- [ ] Deployment logs accessible

### Optional Enhancements
- [ ] Add analytics tracking
- [ ] Add error monitoring (Sentry)
- [ ] Add NetworkStatus indicator
- [ ] Create dynamic contract loading API
- [ ] Add PWA support
- [ ] Configure custom domain
- [ ] Add meta tags for SEO
- [ ] Add OpenGraph images

---

## 🚨 Troubleshooting Guide

### Issue: Build Fails on Vercel

**Symptoms**: Build fails with module errors

**Solutions**:
1. Check Node version matches local (18.x or 20.x)
2. Verify all dependencies in `package.json`
3. Check build logs for missing env vars
4. Ensure root directory set to `frontend/`
5. Clear build cache in Vercel settings

### Issue: RPC Connection Fails

**Symptoms**: "Chain detection failed" or no contract data

**Solutions**:
1. Verify Besu node is running: `ssh ubuntu@130.162.61.132 "docker ps"`
2. Test RPC endpoint: `curl http://130.162.61.132:8545 -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`
3. Check CORS settings in Besu (`--rpc-http-cors-origins=*`)
4. Verify firewall allows port 8545
5. Check Vercel environment variables set correctly

### Issue: Transactions Fail

**Symptoms**: Transactions rejected or timeout

**Solutions**:
1. Verify account has balance
2. Check account is registered manufacturer
3. Verify gas price is 0 (gasless network)
4. Check Besu node synced and mining blocks
5. Inspect Besu logs: `ssh ubuntu@130.162.61.132 "docker logs besu-node-0 -f"`

### Issue: CORS Errors

**Symptoms**: Browser blocks RPC requests

**Solutions**:
1. Verify Besu CORS: `--rpc-http-cors-origins=*`
2. Check `--host-allowlist=*` in Besu config
3. Restart Besu node after config changes
4. Use HTTPS (required by some browsers)

### Issue: Slow Load Times

**Symptoms**: Frontend takes >5s to load

**Solutions**:
1. Enable code splitting in Vite
2. Optimize images and assets
3. Use Vercel Edge Functions for API
4. Add loading skeletons
5. Implement lazy loading for heavy components

---

## 📊 Expected Metrics

### Build Metrics
- **Build Time**: ~60-90 seconds
- **Bundle Size**: ~300-500 KB (gzipped)
- **Deployment Time**: ~30 seconds after build

### Performance Metrics (Lighthouse)
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **SEO**: 90+

### User Experience
- **Time to Interactive**: < 3s
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

---

## 🎓 Learning Resources

### Vite Environment Variables
- [Vite Env Variables Docs](https://vitejs.dev/guide/env-and-mode.html)

### Vercel Deployment
- [Vercel Vite Deployment](https://vercel.com/docs/frameworks/vite)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

### Viem + RPC
- [Viem Public Client](https://viem.sh/docs/clients/public.html)
- [Chain Configuration](https://viem.sh/docs/clients/chains.html)

---

## 📝 Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates in Vercel Analytics
- [ ] Collect user feedback on performance
- [ ] Review Lighthouse scores
- [ ] Optimize slow queries

### Week 2
- [ ] Add API endpoint for contract addresses (if needed)
- [ ] Implement error tracking (Sentry)
- [ ] Add analytics tracking
- [ ] Create monitoring dashboard

### Month 1
- [ ] Review usage patterns
- [ ] Optimize bundle size
- [ ] Add missing features
- [ ] Improve mobile UX

---

## 🎯 Success Metrics

### Technical Success
- ✅ Zero build errors
- ✅ < 500ms API response time
- ✅ 99.9% uptime (Vercel SLA)
- ✅ Lighthouse score > 90

### Business Success
- ✅ Users can create orders
- ✅ Manufacturers can track shipments
- ✅ Real-time state updates work
- ✅ Zero data loss

### Developer Success
- ✅ CI/CD pipeline working
- ✅ Easy to update contracts
- ✅ Clear documentation
- ✅ Reproducible deployments

---

## 🔄 Rollback Plan

### If Deployment Fails
1. **Immediate**: Vercel keeps previous deployment live
2. **Rollback**: Click "Rollback" in Vercel dashboard
3. **Fix**: Debug locally, push fix to branch
4. **Redeploy**: Merge to main after testing

### If Critical Bug Found
1. Create hotfix branch from `main`
2. Fix bug and test locally
3. Create PR with fix
4. Vercel creates preview deployment
5. Test preview deployment
6. Merge to main → auto-deploy

---

## 📞 Support & Resources

### Vercel Support
- **Documentation**: https://vercel.com/docs
- **Community**: https://github.com/vercel/vercel/discussions
- **Status**: https://vercel-status.com

### Besu Support
- **Documentation**: https://besu.hyperledger.org
- **Discord**: https://discord.gg/hyperledger

### Project Maintainer
- Review logs in Vercel dashboard
- Check Besu node health: `ssh ubuntu@130.162.61.132`
- Monitor blockchain: Block explorer view in frontend

---

## 🎉 Conclusion

This roadmap provides a complete path from local development to production deployment on Vercel. Following these phases systematically will result in a production-ready, scalable frontend for your Logistics NFT system.

**Estimated Total Time**: 2-3 hours
**Difficulty**: Intermediate
**Prerequisites**: Git, npm, Vercel account, SSH access to cloud instance

**Next Steps**: Begin with Phase 1 and work through each phase systematically. Test thoroughly at each stage before proceeding.

Good luck with your deployment! 🚀
