# Vercel Deployment Checklist
## Quick Reference Guide

**Total Time**: ~2-3 hours
**Status**: Ready to implement

---

## 🚀 Quick Start (30 min)

### Step 1: Update Configuration Files

```bash
cd frontend
```

#### Create `.env.development`
```bash
cat > .env.development << 'EOF'
VITE_BESU_CLOUD_RPC=http://127.0.0.1:8545
VITE_DEPLOYMENT_SOURCE=local
VITE_ENABLE_DEBUG=true
EOF
```

#### Create `.env.production`
```bash
cat > .env.production << 'EOF'
VITE_BESU_CLOUD_RPC=http://130.162.61.132:8545
VITE_DEPLOYMENT_SOURCE=remote
VITE_ENABLE_DEBUG=false
EOF
```

#### Create `.env.example`
```bash
cat > .env.example << 'EOF'
# Besu Cloud RPC endpoint
VITE_BESU_CLOUD_RPC=http://130.162.61.132:8545

# Deployment info source (local/remote)
VITE_DEPLOYMENT_SOURCE=remote

# Enable debug logging
VITE_ENABLE_DEBUG=false
EOF
```

#### Create `vercel.json`
```bash
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
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
    }
  ]
}
EOF
```

#### Update `.gitignore`
```bash
cat >> .gitignore << 'EOF'

# Environment files
.env
.env.local
.env.development.local
.env.production.local

# Keep templates
!.env.example
!.env.development
!.env.production
EOF
```

### Step 2: Update RPC Endpoint

Edit `public/deployment-info.json` - change line 4:
```json
"rpcUrl": "http://130.162.61.132:8545",
```

### Step 3: Test Build

```bash
# Clean install
rm -rf node_modules dist
npm install

# Test production build
npm run build

# Preview
npm run preview
```

✅ **Checkpoint**: Build succeeds, preview works at http://localhost:4173

---

## 📦 Vercel Setup (30 min)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Install Vercel GitHub App
4. Grant access to your repository

### Step 2: Import Project
1. Click "Add New Project"
2. Select `logistics_prototype` repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Environment Variables
Add in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Env |
|----------|-------|-----|
| `VITE_BESU_CLOUD_RPC` | `http://130.162.61.132:8545` | Production |
| `VITE_DEPLOYMENT_SOURCE` | `remote` | Production |
| `VITE_ENABLE_DEBUG` | `false` | Production |

### Step 4: Deploy
1. Click "Deploy"
2. Wait ~2-3 minutes
3. Get deployment URL: `https://logistics-nft-XXXX.vercel.app`

✅ **Checkpoint**: Deployment succeeds, site is live

---

## ✅ Verification Tests

### Test 1: Basic Functionality
- [ ] Site loads via HTTPS
- [ ] No console errors
- [ ] Chain detected (should show "Besu Cloud - 10001")

### Test 2: Contract Interaction
- [ ] Contracts appear in dashboard
- [ ] Can read manufacturer registry
- [ ] Block numbers update in real-time

### Test 3: Write Operations
- [ ] Select manufacturer account
- [ ] Create test order → transaction succeeds
- [ ] Update order state → transaction succeeds
- [ ] Events appear in realtime monitor

### Test 4: Performance
- [ ] Load time < 3 seconds
- [ ] No CORS errors
- [ ] Mobile responsive

---

## 🔧 Optional Improvements

### Create Config Module (15 min)

**File**: `src/config/env.ts`
```typescript
export const ENV = {
  besuCloudRpc: import.meta.env.VITE_BESU_CLOUD_RPC || 'http://130.162.61.132:8545',
  besuLocalRpc: import.meta.env.VITE_BESU_LOCAL_RPC || 'http://127.0.0.1:8545',
  deploymentSource: import.meta.env.VITE_DEPLOYMENT_SOURCE || 'local',
  debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const

export function validateEnv() {
  if (ENV.debug) {
    console.log('🔧 Environment:', ENV)
  }
}

validateEnv()
```

**Update**: `src/lib/viem.ts` (lines 30 and 62)
```typescript
import { ENV } from '@/config/env'

export const besuCloud: Chain = {
  rpcUrls: {
    default: { http: [ENV.besuCloudRpc] }
  }
}

// In detectChain():
const cloudClient = createPublicClient({
  transport: http(ENV.besuCloudRpc, { timeout: 3000 })
})
```

### Add Error Boundary (10 min)

**File**: `src/components/ErrorBoundary.tsx`
```typescript
import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
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

  componentDidCatch(error: Error) {
    console.error('Error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Update**: `src/main.tsx`
```typescript
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

---

## 🚨 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist .next
npm install
npm run build
```

### RPC Connection Fails
```bash
# Test Besu node
curl -X POST http://130.162.61.132:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x2711"}

# Check Besu running
ssh ubuntu@130.162.61.132 "docker ps | grep besu"
```

### CORS Errors
Already configured in Besu:
```yaml
--rpc-http-cors-origins=*
--host-allowlist=*
```

If still issues, restart Besu:
```bash
ssh ubuntu@130.162.61.132 "cd /opt/logistics/besu && docker compose restart"
```

### Deployment URL Not Working
1. Check Vercel build logs
2. Verify environment variables set
3. Check root directory = `frontend`
4. Verify build command = `npm run build`

---

## 📊 Expected Results

### Build Output
```
✓ 1234 modules transformed
✓ built in 45.67s
dist/index.html                   2.34 kB
dist/assets/index-abc123.css     45.67 kB
dist/assets/index-def456.js     234.56 kB
```

### Deployment URL
```
✅ Production: https://logistics-nft.vercel.app
✅ Preview: https://logistics-nft-git-branch.vercel.app
```

### Performance
- Load time: < 3s
- Lighthouse: 90+
- First paint: < 1.5s

---

## 🎯 Complete Checklist

### Pre-Deployment
- [ ] `.env.development` created
- [ ] `.env.production` created
- [ ] `.env.example` created
- [ ] `vercel.json` created
- [ ] `.gitignore` updated
- [ ] `deployment-info.json` updated (new IP)
- [ ] `npm run build` succeeds
- [ ] `npm run preview` works

### Vercel Setup
- [ ] Vercel account created
- [ ] Repository connected
- [ ] Project imported
- [ ] Root directory set to `frontend`
- [ ] Environment variables added
- [ ] Deployed successfully

### Verification
- [ ] HTTPS site loads
- [ ] Chain connects (Besu Cloud 10001)
- [ ] Contracts load
- [ ] Can read data
- [ ] Can send transactions
- [ ] Real-time updates work
- [ ] Mobile responsive
- [ ] No console errors

### Optional
- [ ] `config/env.ts` created
- [ ] `viem.ts` refactored
- [ ] ErrorBoundary added
- [ ] Custom domain configured
- [ ] Analytics added

---

## 🔄 CI/CD (Automatic)

Once deployed, Vercel automatically:
- ✅ Deploys on push to `main`
- ✅ Creates preview for PRs
- ✅ Runs build checks
- ✅ Provides deployment URLs

---

## 📝 Quick Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel (via git)
git add .
git commit -m "Deploy to Vercel"
git push origin main
# Vercel auto-deploys!

# Manual deploy (if needed)
npx vercel --prod
```

---

## ✅ Success!

When complete, you'll have:
- 🌐 HTTPS frontend on Vercel
- 🔗 Connected to Besu Cloud blockchain
- 🚀 Automatic deployments via GitHub
- 📊 Production-ready architecture
- 💰 $0 monthly cost

**Total time**: 2-3 hours
**Difficulty**: ⭐⭐⭐ (Intermediate)

See full roadmap: `VERCEL_DEPLOYMENT_ROADMAP.md`
