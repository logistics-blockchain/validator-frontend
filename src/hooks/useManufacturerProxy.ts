import { useEffect, useState } from 'react'
import { useAccountStore, selectCurrentAccount } from '@/store/accountStore'
import { useContractStore } from '@/store/contractStore'
import type { Address } from 'viem'

/**
 * Hook to check if current account has a deployed manufacturer proxy
 */
export function useManufacturerProxy() {
  const currentAccount = useAccountStore(selectCurrentAccount)
  const { deploymentPattern, manufacturerProxies } = useContractStore()

  const [hasProxy, setHasProxy] = useState(false)
  const [proxyAddress, setProxyAddress] = useState<Address | null>(null)
  const [isManufacturer, setIsManufacturer] = useState(false)
  const [orderCount, setOrderCount] = useState(0n)

  useEffect(() => {
    if (deploymentPattern !== 'factory' || !currentAccount) {
      setHasProxy(false)
      setProxyAddress(null)
      setIsManufacturer(false)
      setOrderCount(0n)
      return
    }

    // Find current account in manufacturer proxies
    console.log('🔍 Checking proxy for account:', currentAccount)
    console.log('📋 Available manufacturer proxies:', manufacturerProxies.map(p => ({
      manufacturer: p.manufacturer,
      proxy: p.proxyAddress,
      name: p.manufacturerName
    })))

    const manufacturerProxy = manufacturerProxies.find(
      (p) => p.manufacturer.toLowerCase() === currentAccount.toLowerCase()
    )

    console.log('✅ Found proxy for current account:', manufacturerProxy)

    if (manufacturerProxy) {
      setIsManufacturer(true)

      const hasDeployedProxy = manufacturerProxy.proxyAddress !== '0x0000000000000000000000000000000000000000'
      setHasProxy(hasDeployedProxy)
      setProxyAddress(hasDeployedProxy ? manufacturerProxy.proxyAddress : null)
      setOrderCount(manufacturerProxy.orderCount)
    } else {
      setIsManufacturer(false)
      setHasProxy(false)
      setProxyAddress(null)
      setOrderCount(0n)
    }
  }, [currentAccount, deploymentPattern, manufacturerProxies])

  return {
    hasProxy,
    proxyAddress,
    isManufacturer,
    orderCount,
  }
}
