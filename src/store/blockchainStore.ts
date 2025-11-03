import { create } from 'zustand'
import type { Block, Log } from '@/types/blockchain'

interface BlockchainState {
  currentBlock: Block | null
  recentBlocks: Block[]
  events: Log[]
  isConnected: boolean
  refreshing: boolean

  setCurrentBlock: (block: Block) => void
  addBlock: (block: Block) => void
  addEvents: (events: Log[]) => void
  setConnectionStatus: (connected: boolean) => void
  handleRefresh: () => void
  clearAll: () => void
}

export const useBlockchainStore = create<BlockchainState>((set) => ({
  currentBlock: null,
  recentBlocks: [],
  events: [],
  isConnected: false,
  refreshing: false,

  setCurrentBlock: (block) => set({ currentBlock: block }),

  addBlock: (block) =>
    set((state) => {
      // Check if block already exists to prevent duplicates
      const blockExists = state.recentBlocks.some((b) => b.hash === block.hash)
      if (blockExists) {
        return state
      }
      return {
        recentBlocks: [block, ...state.recentBlocks].slice(0, 20),
      }
    }),

  addEvents: (events) =>
    set((state) => ({
      events: [...events, ...state.events].slice(0, 100),
    })),

  setConnectionStatus: (connected) => set({ isConnected: connected }),

  handleRefresh: () => {
    set({ refreshing: true })
    // Give UI time to update before reloading
    setTimeout(() => {
      window.location.reload()
    }, 100)
  },

  clearAll: () =>
    set({
      currentBlock: null,
      recentBlocks: [],
      events: [],
      isConnected: false,
    }),
}))
