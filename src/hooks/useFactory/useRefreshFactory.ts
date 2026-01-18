import { useCallback } from 'react'
import { useContractStore } from '@/store/contractStore'
import { getActiveAccounts } from '@/lib/viem'
import type { Address } from 'viem'

export function useRefreshFactory() {
  const { contracts, factoryInfo, setManufacturerProxies } = useContractStore()

  const refreshFactoryData = useCallback(async () => {
    if (!factoryInfo) return

    try {
      const registryContract = contracts.find((c) => c.name === 'ManufacturerRegistry')
      const factoryContract = contracts.find((c) => c.name === 'LogisticsOrderFactory')
      const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')

      if (!registryContract || !factoryContract || !implementationContract) {
        return
      }

      const { FactoryService } = await import('@/services/factoryService')

      const factoryService = new FactoryService(
        factoryContract.address,
        factoryContract.abi,
        registryContract.address,
        registryContract.abi,
        implementationContract.abi
      )

      const accounts = getActiveAccounts()
      const manufacturerAddresses = accounts.map(acc => acc.address as Address)

      const proxies = await factoryService.loadAllProxies(manufacturerAddresses)
      setManufacturerProxies(proxies)
    } catch (err) {
      console.error('Error refreshing factory data:', err)
    }
  }, [contracts, factoryInfo, setManufacturerProxies])

  return { refreshFactoryData }
}
