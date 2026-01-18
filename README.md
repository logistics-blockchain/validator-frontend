# Logistics NFT Development UI

A flexible, TypeScript-based development UI for blockchain logistics management systems. Supports Hardhat, Besu, and custom EVM-compatible chains. Built with Vite + React + TypeScript + Viem.

## Features

- **Multi-Network Support**: Connect to local Besu, Hardhat, or remote chains with network selector UI
- **Flexible Configuration**: Network and account configuration via JSON and environment variables
- **Account Management**: Switch between multiple accounts with real-time balance updates
- **Contract Discovery**: Automatically detects and displays deployed contracts
- **UUPS Proxy Detection**: Identifies proxy contracts and uses implementation ABIs
- **Dynamic Function Forms**: Auto-generated forms for all contract functions (read & write)
- **Real-time Monitoring**: Live block updates and transaction feed
- **Validator Monitoring**: Network health, block production, and validator status
- **Block Explorer**: Search blocks, transactions, and addresses
- **Type-safe**: Full TypeScript support with Viem's type inference

## Connecting to Your Custom Besu Chain

### Cloud-Hosted Frontend (Vercel)

The Vercel-hosted frontend can connect to **publicly accessible HTTPS** Besu nodes:

1. Click the **Network Selector** in the top-right corner
2. Click **"Add Custom Network"**
3. Enter your node details:
   - Network name (e.g., "My Besu Chain")
   - RPC URL (**must be HTTPS**, e.g., `https://your-node.example.com:8545`)
   - Chain ID (from your genesis file)

**Important**: HTTP URLs will NOT work from the cloud frontend (browsers block mixed content).

**For local nodes**, expose them with Cloudflare Tunnel (free):
```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared  # macOS
# or: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Expose your Besu node
cloudflared tunnel --url http://localhost:8545
# Output: https://random-words-12345.trycloudflare.com
# Use this HTTPS URL in the custom network dialog
```

Custom networks are stored in your browser's localStorage.

**Recommended**: For regular development, run the frontend locally instead (see below).

### Run Frontend Locally

For direct localhost access without exposing your node:

```bash
git clone <repository>
cd validator-frontend
npm install
npm run dev
```

Then add your local node as a custom network using `http://127.0.0.1:8545`.

## Quick Start

### For Local Besu Networks (Run Frontend Locally)

1. **Configure your network** - Edit `public/networks.config.json`:
   ```json
   {
     "networks": [
       {
         "id": "besu-local",
         "name": "Besu Local",
         "chainId": 10001,
         "rpcUrl": "http://127.0.0.1:8545",
         "description": "Local Besu development node",
         "enabled": true
       }
     ],
     "defaultNetwork": "besu-local"
   }
   ```

2. **Configure your accounts** - Create `.env` file:
   ```bash
   cp .env.example .env
   ```

   Add your private keys (comma-separated):
   ```env
   VITE_PRIVATE_KEYS=your_key1,your_key2,your_key3,your_key4
   ```

3. **Run the frontend**:
   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### For Hardhat Networks

1. Start Hardhat node:
   ```bash
   npx hardhat node
   ```

2. Edit `public/networks.config.json` to enable Hardhat:
   ```json
   {
     "networks": [
       {
         "id": "hardhat-local",
         "name": "Hardhat Local",
         "chainId": 31337,
         "rpcUrl": "http://127.0.0.1:8545",
         "enabled": true
       }
     ],
     "defaultNetwork": "hardhat-local"
   }
   ```

3. Run the frontend (private keys optional for Hardhat - defaults to standard test accounts):
   ```bash
   npm run dev
   ```

See [Network Configuration Guide](../docs/FRONTEND_NETWORK_CONFIGURATION.md) for detailed setup instructions.

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

## Network Switching

Click the network selector in the top-right corner of the UI to switch between configured networks. The page will reload to reinitialize all connections.

## Configuration

### Network Configuration (`public/networks.config.json`)

Define available networks and their connection parameters. See the [Network Configuration Guide](../docs/FRONTEND_NETWORK_CONFIGURATION.md) for details.

### Account Configuration (`.env`)

Store private keys in `.env` file (never commit to git):

```env
VITE_PRIVATE_KEYS=key1,key2,key3
VITE_DEFAULT_NETWORK=besu-local
```

If no keys are provided, the frontend falls back to Hardhat's standard test accounts.

## Troubleshooting

**No network selector**: Ensure `public/networks.config.json` exists and at least one network has `enabled: true`

**Connection issues**:
- Check that your blockchain node is running
- Verify RPC URL matches your node's configuration
- Ensure chain ID in config matches your genesis file

**No accounts loaded**: Create `.env` file and add `VITE_PRIVATE_KEYS`. Restart dev server after creating `.env`.

**"No contracts deployed"**: Run `npm run sync` to copy artifacts (Hardhat only)

See the [Network Configuration Guide](../docs/FRONTEND_NETWORK_CONFIGURATION.md) for detailed troubleshooting.

## Vercel Deployment

Deploy to Vercel for cloud hosting:

1. Connect your repository to Vercel
2. Configure environment variables:
   - `VITE_PRIVATE_KEYS` - Account private keys (comma-separated)
   - `RPC_PROXY_TARGET` - Your Besu node RPC endpoint (e.g., `http://your-node:8545`)
   - `VITE_DEFAULT_NETWORK` - Default network ID (optional)

3. Configure `public/networks.config.json` for cloud deployment:
   ```json
   {
     "networks": [
       {
         "id": "besu-cloud",
         "name": "Besu Cloud",
         "chainId": 10001,
         "rpcUrl": "/api/rpc",
         "enabled": true
       }
     ],
     "defaultNetwork": "besu-cloud"
   }
   ```

4. Deploy

See the [Vercel Deployment Guide](../docs/VERCEL_DEPLOYMENT.md) for complete instructions.
