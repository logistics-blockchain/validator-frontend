import { publicClient } from './viem'

// EIP-1967 storage slots
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' as const

export interface ProxyInfo {
  isProxy: boolean
  implementation?: `0x${string}`
  proxyType?: 'UUPS' | 'Transparent' | 'Unknown'
}

export async function detectProxy(address: `0x${string}`): Promise<ProxyInfo> {
  try {
    const implSlotValue = await publicClient.getStorageAt({
      address,
      slot: IMPLEMENTATION_SLOT,
    })

    if (!implSlotValue || implSlotValue === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { isProxy: false }
    }

    // Extract address from storage slot (last 20 bytes / 40 hex chars)
    const implementationAddress = ('0x' + implSlotValue.slice(-40)) as `0x${string}`

    return {
      isProxy: true,
      implementation: implementationAddress,
      proxyType: 'UUPS',
    }
  } catch (error) {
    console.error('Error detecting proxy:', error)
    return { isProxy: false }
  }
}
