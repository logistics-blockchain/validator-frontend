import type { NetworkConfig } from './viem'

const STORAGE_KEY = 'custom_networks'

export interface CustomNetwork extends Omit<NetworkConfig, 'enabled'> {
  custom: true
}

export function getCustomNetworks(): CustomNetwork[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to load custom networks:', error)
    return []
  }
}

export function saveCustomNetwork(network: Omit<CustomNetwork, 'custom'>): void {
  const networks = getCustomNetworks()

  // Check for duplicate ID
  if (networks.some(n => n.id === network.id)) {
    throw new Error(`Network with ID "${network.id}" already exists`)
  }

  networks.push({ ...network, custom: true })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(networks))
}

export function removeCustomNetwork(networkId: string): void {
  const networks = getCustomNetworks()
  const filtered = networks.filter(n => n.id !== networkId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function clearCustomNetworks(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// Generate a unique ID for custom networks
export function generateNetworkId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const timestamp = Date.now().toString(36).slice(-4)
  return `custom-${base}-${timestamp}`
}
