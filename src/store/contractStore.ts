import { create } from 'zustand'
import type { DeployedContract, Order, FactoryInfo, ManufacturerProxy } from '@/types/contracts'
import type { Address, Abi } from 'viem'
import type { DeploymentPattern } from '@/lib/deploymentDetection'
import { useFactoryStore } from './factoryStore'

interface ContractState {
  contracts: DeployedContract[]
  loading: boolean
  error: string | null
  deploymentPattern: DeploymentPattern

  setContracts: (contracts: DeployedContract[]) => void
  addContract: (contract: DeployedContract) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setDeploymentPattern: (pattern: DeploymentPattern) => void

  // Delegated to factoryStore for backwards compatibility
  factoryInfo: FactoryInfo | null
  manufacturerProxies: ManufacturerProxy[]
  selectedManufacturerProxy: Address | null
  nfts: Record<Address, Order[]>
  nftLoading: Record<Address, boolean>
  setFactoryInfo: (info: FactoryInfo | null) => void
  setManufacturerProxies: (proxies: ManufacturerProxy[]) => void
  selectManufacturerProxy: (address: Address | null) => void
  fetchNftsForContract: (contractAddress: Address, abi: Abi) => Promise<void>
}

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  loading: false,
  error: null,
  deploymentPattern: 'unknown',

  setContracts: (contracts) => set({ contracts }),

  addContract: (contract) =>
    set((state) => ({
      contracts: [...state.contracts, contract],
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setDeploymentPattern: (pattern) => set({ deploymentPattern: pattern }),

  // Getters that delegate to factoryStore
  get factoryInfo() {
    return useFactoryStore.getState().factoryInfo
  },

  get manufacturerProxies() {
    return useFactoryStore.getState().manufacturerProxies
  },

  get selectedManufacturerProxy() {
    return useFactoryStore.getState().selectedManufacturerProxy
  },

  get nfts() {
    return useFactoryStore.getState().nfts
  },

  get nftLoading() {
    return useFactoryStore.getState().nftLoading
  },

  // Actions that delegate to factoryStore
  setFactoryInfo: (info) => useFactoryStore.getState().setFactoryInfo(info),

  setManufacturerProxies: (proxies) => useFactoryStore.getState().setManufacturerProxies(proxies),

  selectManufacturerProxy: (address) => useFactoryStore.getState().selectManufacturerProxy(address),

  fetchNftsForContract: (contractAddress, abi) =>
    useFactoryStore.getState().fetchNftsForContract(contractAddress, abi),
}))
