import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { Chain, Address } from 'viem'

// Network configuration types
export interface NetworkConfig {
  id: string
  name: string
  chainId: number
  rpcUrl: string
  description?: string
  enabled: boolean
}

export interface NetworksConfig {
  networks: NetworkConfig[]
  defaultNetwork: string
}

export interface Account {
  address: Address
  privateKey: `0x${string}`
}

// Default Hardhat accounts for immediate availability
const defaultAccounts: Account[] = [
  { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
  { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
  { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
  { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
  { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', privateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
  { address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
  { address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', privateKey: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
  { address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', privateKey: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97' },
  { address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', privateKey: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6' },
]

// Load networks configuration
let networksConfig: NetworksConfig | null = null
let accounts: Account[] = defaultAccounts

async function loadNetworksConfig(): Promise<NetworksConfig> {
  if (networksConfig) return networksConfig

  try {
    const response = await fetch('/networks.config.json')
    if (!response.ok) {
      throw new Error(`Failed to load networks config: ${response.statusText}`)
    }
    const config = await response.json()

    // Load custom networks from localStorage and merge
    const customNetworks = loadCustomNetworksFromStorage()
    config.networks = [...config.networks, ...customNetworks]

    networksConfig = config
    console.log('✅ Loaded networks configuration:', networksConfig)
    return networksConfig
  } catch (error) {
    console.error('❌ Failed to load networks config:', error)
    // Return default config as fallback
    networksConfig = {
      networks: [
        {
          id: 'besu-cloud',
          name: 'Besu Cloud',
          chainId: 10002,
          rpcUrl: '/api/rpc',
          enabled: true
        }
      ],
      defaultNetwork: 'besu-cloud'
    }
    return networksConfig
  }
}

function loadCustomNetworksFromStorage(): NetworkConfig[] {
  try {
    const stored = localStorage.getItem('custom_networks')
    if (!stored) return []
    const custom = JSON.parse(stored)
    return custom.map((n: any) => ({
      ...n,
      enabled: true
    }))
  } catch (error) {
    console.error('Failed to load custom networks from localStorage:', error)
    return []
  }
}

// Load accounts from environment variables
function loadAccounts(): Account[] {
  const privateKeysEnv = import.meta.env.VITE_PRIVATE_KEYS

  if (!privateKeysEnv) {
    console.warn('⚠️ No VITE_PRIVATE_KEYS found in environment variables')
    console.warn('⚠️ Please add private keys to your .env file')
    console.warn('⚠️ Using default development accounts as fallback')

    // Return Hardhat's first 10 default accounts as fallback for development
    return [
      { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
      { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
      { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
      { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
      { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
      { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', privateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
      { address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
      { address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', privateKey: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
      { address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', privateKey: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97' },
      { address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', privateKey: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6' },
    ]
  }

  // Parse comma-separated private keys
  const keys = privateKeysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0)

  if (keys.length === 0) {
    console.warn('⚠️ VITE_PRIVATE_KEYS is empty')
    return []
  }

  // Convert keys to accounts
  const loadedAccounts = keys.map(key => {
    const privateKey = key.startsWith('0x') ? key as `0x${string}` : `0x${key}` as `0x${string}`
    const account = privateKeyToAccount(privateKey)
    return {
      address: account.address,
      privateKey
    }
  })

  console.log(`✅ Loaded ${loadedAccounts.length} accounts from environment`)
  return loadedAccounts
}

// Convert NetworkConfig to Viem Chain
function networkConfigToChain(config: NetworkConfig): Chain {
  return {
    id: config.chainId,
    name: config.name,
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
    },
    testnet: true,
  }
}

// Default/fallback chain for immediate initialization
// Use /api/rpc for production, falls back to cloud RPC target
const defaultChain: Chain = {
  id: 10001,
  name: 'Besu Cloud',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['/api/rpc'] },
  },
  testnet: true,
}

// Chain state management
let _activeNetworkId: string | null = null
let _chain: Chain = defaultChain
let _publicClient: ReturnType<typeof createPublicClient> = createPublicClient({
  chain: defaultChain,
  transport: http(),
  batch: { multicall: true },
  pollingInterval: 1_000,
})
let _initPromise: Promise<void> | null = null

// Initialize networks and accounts
async function initialize() {
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    // Load configuration
    const config = await loadNetworksConfig()
    accounts = loadAccounts()

    // Determine default network
    const defaultNetworkId = import.meta.env.VITE_DEFAULT_NETWORK || config.defaultNetwork
    const defaultNetwork = config.networks.find(n => n.id === defaultNetworkId && n.enabled)

    if (!defaultNetwork) {
      throw new Error(`Default network "${defaultNetworkId}" not found or not enabled`)
    }

    // Set active network
    await setActiveNetwork(defaultNetwork.id)
  })()

  return _initPromise
}

// Set the active network
export async function setActiveNetwork(networkId: string) {
  const config = await loadNetworksConfig()
  const network = config.networks.find(n => n.id === networkId && n.enabled)

  if (!network) {
    throw new Error(`Network "${networkId}" not found or not enabled`)
  }

  _activeNetworkId = networkId
  _chain = networkConfigToChain(network)

  // Recreate public client with new chain
  _publicClient = createPublicClient({
    chain: _chain,
    transport: http(),
    batch: { multicall: true },
    pollingInterval: 1_000,
  })

  console.log(`✅ Switched to network: ${network.name} (Chain ID: ${network.chainId})`)
  console.log(`   RPC: ${network.rpcUrl}`)
}

// Get all available networks
export async function getAvailableNetworks(): Promise<NetworkConfig[]> {
  const config = await loadNetworksConfig()
  return config.networks.filter(n => n.enabled)
}

// Reload networks configuration (useful after adding/removing custom networks)
export async function reloadNetworksConfig(): Promise<void> {
  networksConfig = null
  await loadNetworksConfig()
}

// Get active network ID
export function getActiveNetworkId(): string | null {
  return _activeNetworkId
}

// Get active chain
export function getActiveChain(): Chain {
  return _chain
}

// Get active accounts
export function getActiveAccounts(): Account[] {
  return accounts
}

// Create wallet client for specific account
export function createWalletClientForAccount(accountIndex: number) {
  const accountData = accounts[accountIndex]
  if (!accountData) {
    throw new Error(`Account index ${accountIndex} out of range (have ${accounts.length} accounts)`)
  }

  const account = privateKeyToAccount(accountData.privateKey)

  return createWalletClient({
    account,
    chain: getActiveChain(),
    transport: http(),
  })
}

// Proxied public client for backward compatibility
export const publicClient = new Proxy({} as ReturnType<typeof createPublicClient>, {
  get(target, prop) {
    return _publicClient[prop as keyof typeof _publicClient]
  }
})

// Auto-initialize on module load
initialize().catch(error => {
  console.error('❌ Failed to initialize viem:', error)
})
