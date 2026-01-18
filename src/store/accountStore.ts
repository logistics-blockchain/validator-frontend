import { create } from 'zustand'
import type { Address } from 'viem'
import { getActiveAccounts } from '@/lib/viem'

interface AccountState {
  selectedAccountIndex: number
  balances: Map<Address, bigint>

  setSelectedAccount: (index: number) => void
  updateBalance: (address: Address, balance: bigint) => void
  getSelectedAccount: () => ReturnType<typeof getActiveAccounts>[number]
}

export const useAccountStore = create<AccountState>((set, get) => ({
  selectedAccountIndex: 0,
  balances: new Map(),

  setSelectedAccount: (index) => set({ selectedAccountIndex: index }),

  updateBalance: (address, balance) =>
    set((state) => {
      const newBalances = new Map(state.balances)
      newBalances.set(address, balance)
      return { balances: newBalances }
    }),

  getSelectedAccount: () => getActiveAccounts()[get().selectedAccountIndex],
}))

// Selectors for derived state
export const selectCurrentAccount = (state: AccountState): Address | null => {
  return getActiveAccounts()[state.selectedAccountIndex]?.address || null
}

export const selectCurrentAccountIndex = (state: AccountState): number => {
  return state.selectedAccountIndex
}
