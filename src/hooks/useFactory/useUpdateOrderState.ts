import { useState, useCallback } from 'react'
import { useContractStore } from '@/store/contractStore'
import { useAccountStore, selectCurrentAccount, selectCurrentAccountIndex } from '@/store/accountStore'
import { createWalletClientForAccount, publicClient } from '@/lib/viem'
import { getContract } from 'viem'
import { useRefreshFactory } from './useRefreshFactory'

export function useUpdateOrderState() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { contracts, selectedManufacturerProxy } = useContractStore()
  const currentAccount = useAccountStore(selectCurrentAccount)
  const currentAccountIndex = useAccountStore(selectCurrentAccountIndex)
  const { refreshFactoryData } = useRefreshFactory()

  const updateOrderState = useCallback(async (tokenId: bigint, newState: number): Promise<void> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!selectedManufacturerProxy) {
      throw new Error('No manufacturer proxy selected')
    }

    setLoading(true)
    setError(null)

    try {
      const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')
      if (!implementationContract) {
        throw new Error('Implementation contract not found')
      }

      const walletClient = createWalletClientForAccount(currentAccountIndex)

      const proxy = getContract({
        address: selectedManufacturerProxy,
        abi: implementationContract.abi,
        client: { public: publicClient, wallet: walletClient },
      })

      const hash = await proxy.write.updateState([tokenId, newState])
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      await refreshFactoryData()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order state'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [contracts, selectedManufacturerProxy, currentAccount, currentAccountIndex, refreshFactoryData])

  return { updateOrderState, loading, error }
}
