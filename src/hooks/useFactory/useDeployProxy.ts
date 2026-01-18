import { useState, useCallback } from 'react'
import { useContractStore } from '@/store/contractStore'
import { useAccountStore, selectCurrentAccount, selectCurrentAccountIndex } from '@/store/accountStore'
import { createWalletClientForAccount, publicClient } from '@/lib/viem'
import { getContract, decodeEventLog } from 'viem'
import { useRefreshFactory } from './useRefreshFactory'
import type { Address } from 'viem'

export function useDeployProxy() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { contracts, factoryInfo } = useContractStore()
  const currentAccount = useAccountStore(selectCurrentAccount)
  const currentAccountIndex = useAccountStore(selectCurrentAccountIndex)
  const { refreshFactoryData } = useRefreshFactory()

  const deployProxy = useCallback(async (): Promise<Address> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!factoryInfo) {
      throw new Error('Factory info not loaded')
    }

    setLoading(true)
    setError(null)

    try {
      const factoryContract = contracts.find((c) => c.name === 'LogisticsOrderFactory')
      if (!factoryContract) {
        throw new Error('Factory contract not found')
      }

      const walletClient = createWalletClientForAccount(currentAccountIndex)

      const factory = getContract({
        address: factoryContract.address,
        abi: factoryContract.abi,
        client: { public: publicClient, wallet: walletClient },
      })

      const hash = await factory.write.createLogisticsOrder()
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      let proxyAddress: Address | null = null

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: factory.abi,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === 'ProxyDeployed') {
            proxyAddress = (decoded.args as any).proxyAddress
            break
          }
        } catch {
          continue
        }
      }

      if (!proxyAddress) {
        throw new Error('ProxyDeployed event not found')
      }

      await refreshFactoryData()

      return proxyAddress
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to deploy proxy'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [contracts, factoryInfo, currentAccount, currentAccountIndex, refreshFactoryData])

  return { deployProxy, loading, error }
}
