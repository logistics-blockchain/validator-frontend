import { create } from 'zustand'
import type { Order, FactoryInfo, ManufacturerProxy } from '@/types/contracts'
import { publicClient } from '@/lib/viem'
import type { Address, Abi } from 'viem'

interface FactoryState {
  factoryInfo: FactoryInfo | null
  manufacturerProxies: ManufacturerProxy[]
  selectedManufacturerProxy: Address | null
  nfts: Record<Address, Order[]>
  nftLoading: Record<Address, boolean>

  setFactoryInfo: (info: FactoryInfo | null) => void
  setManufacturerProxies: (proxies: ManufacturerProxy[]) => void
  selectManufacturerProxy: (address: Address | null) => void
  fetchNftsForContract: (contractAddress: Address, abi: Abi) => Promise<void>
  refreshFactoryInfo: () => Promise<void>
}

export const useFactoryStore = create<FactoryState>((set) => ({
  factoryInfo: null,
  manufacturerProxies: [],
  selectedManufacturerProxy: null,
  nfts: {},
  nftLoading: {},

  setFactoryInfo: (info) => set({ factoryInfo: info }),

  setManufacturerProxies: (proxies) => set({ manufacturerProxies: proxies }),

  selectManufacturerProxy: (address) => set({ selectedManufacturerProxy: address }),

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
    } finally {
      set((state) => ({ nftLoading: { ...state.nftLoading, [contractAddress]: false } }))
    }
  },

  refreshFactoryInfo: async () => {
    console.log('Refresh factory info called')
  },
}))
