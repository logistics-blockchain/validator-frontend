import { useEffect } from 'react'
import { useContractStore } from '@/store/contractStore'
import { publicClient } from '@/lib/viem'
import type { Address } from 'viem'

/**
 * Hook to watch factory events and auto-update state
 * Listens to ProxyDeployed events to refresh manufacturer proxy list
 */
export function useFactoryEvents() {
  const {
    deploymentPattern,
    contracts,
    factoryInfo,
    setManufacturerProxies,
  } = useContractStore()

  useEffect(() => {
    // Only work in factory mode
    if (deploymentPattern !== 'factory' || !factoryInfo) {
      return
    }

    // Wait for contracts to load
    if (contracts.length === 0) {
      return
    }

    const factoryContract = contracts.find((c) => c.name === 'LogisticsOrderFactory')
    const registryContract = contracts.find((c) => c.name === 'ManufacturerRegistry')
    const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')

    if (!factoryContract || !registryContract || !implementationContract) {
      // Contracts not yet loaded, will retry on next render
      return
    }

    console.log('📡 Starting to watch ProxyDeployed events...')

    // Watch for ProxyDeployed events
    const unwatch = publicClient.watchContractEvent({
      address: factoryContract.address,
      abi: factoryContract.abi,
      eventName: 'ProxyDeployed',
      onLogs: async (logs) => {
        console.log('🔔 ProxyDeployed event detected:', logs)

        for (const log of logs) {
          try {
            const { args } = log as any
            const manufacturer = args?.manufacturer as Address
            const proxyAddress = args?.proxyAddress as Address

            if (manufacturer && proxyAddress) {
              console.log(`✅ New proxy deployed: ${manufacturer} -> ${proxyAddress}`)

              // Reload all manufacturer proxies to update the list
              await refreshManufacturerProxies(
                factoryContract.address,
                factoryContract.abi,
                registryContract.address,
                registryContract.abi,
                implementationContract.abi
              )
            }
          } catch (err) {
            console.error('Error processing ProxyDeployed event:', err)
          }
        }
      },
    })

    // Cleanup on unmount
    return () => {
      console.log('📡 Stopping event watcher')
      unwatch()
    }
  }, [deploymentPattern, factoryInfo, contracts, setManufacturerProxies])

  /**
   * Refresh manufacturer proxies after event
   */
  const refreshManufacturerProxies = async (
    factoryAddress: Address,
    factoryAbi: any,
    registryAddress: Address,
    registryAbi: any,
    implementationAbi: any
  ) => {
    try {
      // Dynamically import FactoryService and getActiveAccounts to avoid circular dependencies
      const { FactoryService } = await import('@/services/factoryService')
      const { getActiveAccounts } = await import('@/lib/viem')

      const factoryService = new FactoryService(
        factoryAddress,
        factoryAbi,
        registryAddress,
        registryAbi,
        implementationAbi
      )

      // Load known manufacturers (all active accounts)
      const accounts = getActiveAccounts()
      const manufacturerAddresses = accounts.map(acc => acc.address as Address)

      const proxies = await factoryService.loadAllProxies(manufacturerAddresses)
      setManufacturerProxies(proxies)

      console.log('✅ Manufacturer proxies refreshed:', proxies.length)
    } catch (err) {
      console.error('Error refreshing manufacturer proxies:', err)
    }
  }
}
