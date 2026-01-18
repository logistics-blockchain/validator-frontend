import { createPublicClient, http } from 'viem'
import { config } from '../config.js'

// Define custom chain for Besu QBFT
const besuChain = {
  id: 10002,
  name: 'Besu QBFT',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
} as const

export const publicClient = createPublicClient({
  chain: besuChain,
  transport: http(config.rpcUrl),
  batch: {
    multicall: true,
  },
})

export async function getCurrentBlockNumber(): Promise<bigint> {
  return publicClient.getBlockNumber()
}

export async function getBlock(blockNumber: bigint) {
  return publicClient.getBlock({
    blockNumber,
    includeTransactions: true,
  })
}

export async function getTransactionReceipt(hash: `0x${string}`) {
  return publicClient.getTransactionReceipt({ hash })
}
