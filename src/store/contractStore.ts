import { create } from 'zustand'
import type { DeployedContract, Order, FactoryInfo, ManufacturerProxy } from '@/types/contracts'
import { publicClient } from '@/lib/viem'
import type { Address, Abi } from 'viem'
import type { DeploymentPattern } from '@/lib/deploymentDetection'

interface ContractState {
  // Existing state
  contracts: DeployedContract[]
  loading: boolean
  error: string | null
  nfts: Record<Address, Order[]>
  nftLoading: Record<Address, boolean>

  // Factory pattern state
  deploymentPattern: DeploymentPattern
  factoryInfo: FactoryInfo | null
  manufacturerProxies: ManufacturerProxy[]
  selectedManufacturerProxy: Address | null

  // Existing actions
  setContracts: (contracts: DeployedContract[]) => void
  addContract: (contract: DeployedContract) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchNftsForContract: (contractAddress: Address, abi: Abi) => Promise<void>

  // Factory actions
  setDeploymentPattern: (pattern: DeploymentPattern) => void
  setFactoryInfo: (info: FactoryInfo | null) => void
  setManufacturerProxies: (proxies: ManufacturerProxy[]) => void
  selectManufacturerProxy: (address: Address | null) => void
  refreshFactoryInfo: () => Promise<void>
}

export const useContractStore = create<ContractState>((set, get) => ({
  // Existing state initialization
  contracts: [],
  loading: false,
  error: null,
  nfts: {},
  nftLoading: {},

  // Factory state initialization
  deploymentPattern: 'unknown',
  factoryInfo: null,
  manufacturerProxies: [],
  selectedManufacturerProxy: null,

  // Existing actions
  setContracts: (contracts) => set({ contracts }),

  addContract: (contract) =>
    set((state) => ({
      contracts: [...state.contracts, contract],
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  fetchNftsForContract: async (contractAddress: Address, abi: Abi) => {
    set((state) => ({ nftLoading: { ...state.nftLoading, [contractAddress]: true } }))

    try {
      const totalSupply = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'getTotalSupply',
      }) as bigint

      const promises = []
      for (let i = 1n; i <= totalSupply; i++) {
        promises.push(
          publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'getOrder',
            args: [i],
          })
        )
      }

      const orders = (await Promise.all(promises)) as Order[]

      set((state) => ({
        nfts: { ...state.nfts, [contractAddress]: orders },
      }))
    } catch (e: any) {
      console.error('Failed to fetch NFTs', e)
      set({ error: e.message })
    } finally {
      set((state) => ({ nftLoading: { ...state.nftLoading, [contractAddress]: false } }))
    }
  },

  // Factory actions
  setDeploymentPattern: (pattern) => set({ deploymentPattern: pattern }),

  setFactoryInfo: (info) => set({ factoryInfo: info }),

  setManufacturerProxies: (proxies) => set({ manufacturerProxies: proxies }),

  selectManufacturerProxy: (address) => set({ selectedManufacturerProxy: address }),

  refreshFactoryInfo: async () => {
    // This will be called by factory service to refresh data
    // Implementation will be added when factory service is created
    console.log('Refresh factory info called')
  },
}))
