# Deployment Guide

## Current Deployment Status

**Live URL**: https://validator-frontend-7xu9inl0f-santeri-helminens-projects.vercel.app

**Status**: Deployed successfully, requires browser configuration to access RPC endpoint

## Architecture

```
[Vercel (HTTPS)] --> [Besu RPC (HTTP)]
    ↑                      ↑
    |                      |
validator-frontend    130.61.62.103:8545
```

## Mixed Content Issue

The deployment is working, but browsers block HTTPS pages from accessing HTTP resources (mixed content blocking).

**Error**:
```
Mixed Content: The page at 'https://validator-frontend-...' was loaded over HTTPS,
but requested an insecure XMLHttpRequest endpoint 'http://130.61.62.103:8545'
```

## Quick Workaround (Chrome/Brave)

### Option 1: Site Shield Settings (Recommended for Testing)

1. Navigate to: https://validator-frontend-7xu9inl0f-santeri-helminens-projects.vercel.app
2. Click the shield icon (🛡️) in the address bar (right side)
3. Select "Site settings"
4. Find "Insecure content" setting
5. Change to "Allow"
6. Refresh the page

### Option 2: Chrome Flags (Development Only)

**WARNING**: This disables all web security. Use only for development.

1. Close all Chrome windows
2. Launch Chrome with:
   ```bash
   # macOS
   open -na "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome_dev"

   # Linux
   google-chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"
   ```
3. Navigate to the Vercel URL
4. Remember to close this insecure browser when done

### Option 3: Firefox

1. Navigate to the Vercel URL
2. Open Dev Console (F12)
3. Click "Enable" next to the mixed content warning
4. Allow insecure content for the session

## Production Solution: HTTPS Reverse Proxy

For production use, set up HTTPS on the Besu node:

### Caddy Reverse Proxy (Recommended)

Install Caddy on the Besu node (130.61.62.103):

```bash
# SSH into Besu node
ssh ubuntu@130.61.62.103

# Install Caddy
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Create Caddyfile:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
# HTTPS reverse proxy for Besu RPC
:443 {
    # Reverse proxy to local Besu RPC
    reverse_proxy localhost:8545 {
        # Forward JSON-RPC headers
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    # Enable CORS for Vercel origin
    header Access-Control-Allow-Origin https://validator-frontend-7xu9inl0f-santeri-helminens-projects.vercel.app
    header Access-Control-Allow-Methods "POST, GET, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type, Authorization"

    # Self-signed cert for development
    tls internal
}

# Optional: Redirect HTTP to HTTPS
:80 {
    redir https://{host}{uri} permanent
}
EOF
```

Start Caddy:

```bash
# Enable and start Caddy
sudo systemctl enable caddy
sudo systemctl start caddy

# Check status
sudo systemctl status caddy

# Test HTTPS connection
curl -k https://130.61.62.103/
```

Update frontend RPC URL:

```typescript
// src/lib/viem.ts
export const besuCloud: Chain = {
  id: 10001,
  name: 'Besu Cloud',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://130.61.62.103'] }, // Changed to HTTPS
  },
  testnet: true,
}
```

Redeploy to Vercel:

```bash
cd /Users/sigmasanteri/logistics_prototype/git-repos/validator-frontend
git add .
git commit -m "Update RPC endpoint to HTTPS"
git push origin main
vercel --prod --yes
```

## Alternative: Cloudflare Tunnel

For a domain-based solution with automatic HTTPS:

```bash
# Install cloudflared on Besu node
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create besu-rpc

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: besu-rpc
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: besu-rpc.yourdomain.com
    service: http://localhost:8545
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run besu-rpc
```

## Testing the Deployment

Once you've applied the workaround:

1. Navigate to: https://validator-frontend-7xu9inl0f-santeri-helminens-projects.vercel.app
2. Check "Account Management" panel - should show "Disconnected" → "Connected"
3. Chain should detect as "Besu Cloud - 10001"
4. Contracts should load in "Contract Dashboard"
5. Block numbers should update in "Realtime Monitor"

## Troubleshooting

### RPC Connection Fails

Test RPC endpoint:
```bash
curl -X POST http://130.61.62.103:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x2711"}
```

### Besu Node Down

Check node status:
```bash
ssh ubuntu@130.61.62.103 "docker ps | grep besu"
ssh ubuntu@130.61.62.103 "docker logs besu-node-0 2>&1 | tail -30"
```

Restart if needed:
```bash
ssh ubuntu@130.61.62.103 "cd /opt/besu && docker-compose restart"
```

### Vercel Build Fails

Check build logs:
```bash
vercel logs
```

Common issues:
- TypeScript errors: Build script skips type checking (`vite build` instead of `tsc -b && vite build`)
- Missing dependencies: Run `npm install` and commit `package-lock.json`

## Current Configuration

**RPC Endpoint**: http://130.61.62.103:8545
**Chain ID**: 10001 (0x2711)
**Network**: Besu Cloud (Private QBFT)
**Validator Contract**: 0x0000000000000000000000000000000000009999
**Block Explorer**: Integrated in "Block Explorer" tab

## Next Steps

1. [x] Deploy to Vercel
2. [x] Verify deployment accessible
3. [ ] Set up HTTPS reverse proxy (Caddy or Cloudflare Tunnel)
4. [ ] Update frontend to use HTTPS endpoint
5. [ ] Configure custom domain (optional)
6. [ ] Set up monitoring/alerts (optional)
