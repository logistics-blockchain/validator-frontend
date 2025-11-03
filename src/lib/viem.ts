import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { Chain } from 'viem'

export const hardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
}

export const besuLocal: Chain = {
  id: 10001,
  name: 'Besu Local',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
}

export const besuCloud: Chain = {
  id: 10001,
  name: 'Besu Cloud',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://130.61.62.103:8545'] },
  },
  testnet: true,
}

// Hardhat's default 20 test accounts
export const HARDHAT_ACCOUNTS = [
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
] as const

// Besu cloud validator accounts (2 QBFT validators)
export const BESU_ACCOUNTS = [
  { address: '0xf176465f83bfa22f1057e4353b5a100a1c198507', privateKey: '0x39370a408c1179415a5ccd89c6c20bc8eaa33e5d0eb83d0f46fed040e5d2ae73' },  // Cloud Node 0
  { address: '0xef832eca2439987697d43917f9d3d0dd1e9410b7', privateKey: '0x51d1695ea8d42d178db3d8c20d9e9d7251c573f4b96fc7a3f4fb2e2a4e541372' },  // Cloud Node 1
] as const

// Auto-detect which chain we're connected to
async function detectChain(): Promise<Chain> {
  // Try cloud first
  try {
    const cloudClient = createPublicClient({
      transport: http('http://130.61.62.103:8545', { timeout: 3000 }),
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
      transport: http('http://127.0.0.1:8545', { timeout: 2000 }),
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

// Chain state management
let _chain: Chain = besuCloud // Default to Cloud since that's our deployment
let _chainDetected = false
let _publicClient = createPublicClient({
  chain: besuCloud,
  transport: http(),
  batch: { multicall: true },
  pollingInterval: 1_000,
})

// Initialize chain detection and recreate client
detectChain().then((chain) => {
  _chain = chain
  _chainDetected = true

  // Recreate public client with detected chain
  _publicClient = createPublicClient({
    chain: chain,
    transport: http(),
    batch: { multicall: true },
    pollingInterval: 1_000,
  })

  console.log(`✅ Public client initialized for ${chain.name} (${chain.id})`)
})

export const publicClient = new Proxy({} as ReturnType<typeof createPublicClient>, {
  get(target, prop) {
    return _publicClient[prop as keyof typeof _publicClient]
  }
})

export function getActiveChain(): Chain {
  return _chain
}

export function getActiveAccounts() {
  return _chain.id === 10001 ? BESU_ACCOUNTS : HARDHAT_ACCOUNTS
}

export function createWalletClientForAccount(accountIndex: number) {
  const accounts = getActiveAccounts()
  const accountData = accounts[accountIndex]
  if (!accountData) {
    throw new Error(`Account index ${accountIndex} out of range`)
  }

  const account = privateKeyToAccount(accountData.privateKey as `0x${string}`)

  return createWalletClient({
    account,
    chain: getActiveChain(),
    transport: http(),
  })
}
