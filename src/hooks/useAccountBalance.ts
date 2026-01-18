import { useEffect } from 'react'
import { publicClient, getActiveAccounts } from '@/lib/viem'
import { useAccountStore } from '@/store/accountStore'
import type { Address } from 'viem'

export function useAccountBalance() {
  const { selectedAccountIndex, updateBalance } = useAccountStore()

  useEffect(() => {
    const fetchBalance = async () => {
      const accounts = getActiveAccounts()
      const account = accounts[selectedAccountIndex]
      try {
        const balance = await publicClient.getBalance({
          address: account.address as Address,
        })
        updateBalance(account.address as Address, balance)
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }

    fetchBalance()

    // Poll for balance updates every 2 seconds
    const interval = setInterval(fetchBalance, 2000)

    return () => clearInterval(interval)
  }, [selectedAccountIndex, updateBalance])
}
