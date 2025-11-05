import { useState } from 'react'
import { useContractStore } from '@/store/contractStore'
import { useAccountStore, selectCurrentAccount, selectCurrentAccountIndex } from '@/store/accountStore'
import { createWalletClientForAccount, getActiveAccounts } from '@/lib/viem'
import { publicClient } from '@/lib/viem'
import { getContract, decodeEventLog } from 'viem'
import type { Address, Abi } from 'viem'

/**
 * Hook for factory pattern actions
 * Provides functions to deploy proxies, create orders, and update states
 */
export function useFactoryActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    deploymentPattern,
    contracts,
    factoryInfo,
    selectedManufacturerProxy,
    setManufacturerProxies,
  } = useContractStore()

  const currentAccount = useAccountStore(selectCurrentAccount)
  const currentAccountIndex = useAccountStore(selectCurrentAccountIndex)

  // Only work in factory mode
  if (deploymentPattern !== 'factory') {
    return {
      deployProxy: async () => {
        throw new Error('Not in factory mode')
      },
      createOrder: async () => {
        throw new Error('Not in factory mode')
      },
      updateOrderState: async () => {
        throw new Error('Not in factory mode')
      },
      loading: false,
      error: 'Not in factory mode',
    }
  }

  /**
   * Deploy a new manufacturer proxy
   */
  const deployProxy = async (): Promise<Address> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!factoryInfo) {
      throw new Error('Factory info not loaded')
    }

    setLoading(true)
    setError(null)

    try {
      // Get factory contract
      const factoryContract = contracts.find((c) => c.name === 'LogisticsOrderFactory')
      if (!factoryContract) {
        throw new Error('Factory contract not found')
      }

      // Create wallet client for current account
      const walletClient = createWalletClientForAccount(currentAccountIndex)

      // Get contract instance with write access
      const factory = getContract({
        address: factoryContract.address,
        abi: factoryContract.abi,
        client: { public: publicClient, wallet: walletClient },
      })

      // Call createLogisticsOrder
      console.log('Deploying proxy for manufacturer:', currentAccount)
      const hash = await factory.write.createLogisticsOrder()

      // Wait for transaction
      console.log('Waiting for transaction:', hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      // Parse ProxyDeployed event to get proxy address using viem's decodeEventLog
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
          // Skip logs that don't match
          continue
        }
      }

      if (!proxyAddress) {
        throw new Error('ProxyDeployed event not found')
      }

      console.log('✅ Proxy deployed:', proxyAddress)

      // Refresh factory info to update UI
      await refreshFactoryData()

      return proxyAddress
    } catch (err: any) {
      console.error('Deploy proxy error:', err)
      const errorMessage = err.message || 'Failed to deploy proxy'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new order on the selected manufacturer proxy
   */
  const createOrder = async (receiver: Address, ipfsHash: string): Promise<bigint> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!selectedManufacturerProxy) {
      throw new Error('No manufacturer proxy selected')
    }

    setLoading(true)
    setError(null)

    try {
      // Get implementation ABI
      const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')
      if (!implementationContract) {
        throw new Error('Implementation contract not found')
      }

      // Create wallet client
      const walletClient = createWalletClientForAccount(currentAccountIndex)

      // Get proxy contract with implementation ABI
      const proxy = getContract({
        address: selectedManufacturerProxy,
        abi: implementationContract.abi,
        client: { public: publicClient, wallet: walletClient },
      })

      // Call createOrder
      console.log('Creating order:', { receiver, ipfsHash })
      const hash = await proxy.write.createOrder([receiver, ipfsHash])

      // Wait for transaction
      console.log('Waiting for transaction:', hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      // Parse OrderCreated event to get token ID
      const orderCreatedLog = receipt.logs.find((log: any) => {
        // Look for OrderCreated event
        return log.topics[0] === '0x...' // Would need actual event signature
      })

      // For now, read the total supply to get the new token ID
      const totalSupply = (await proxy.read.getTotalSupply()) as bigint
      const tokenId = totalSupply // Assuming sequential IDs

      console.log('✅ Order created:', tokenId)

      // Refresh factory data
      await refreshFactoryData()

      return tokenId
    } catch (err: any) {
      console.error('Create order error:', err)
      const errorMessage = err.message || 'Failed to create order'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update order state on the selected manufacturer proxy
   */
  const updateOrderState = async (tokenId: bigint, newState: number): Promise<void> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!selectedManufacturerProxy) {
      throw new Error('No manufacturer proxy selected')
    }

    setLoading(true)
    setError(null)

    try {
      // Get implementation ABI
      const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')
      if (!implementationContract) {
        throw new Error('Implementation contract not found')
      }

      // Create wallet client
      const walletClient = createWalletClientForAccount(currentAccountIndex)

      // Get proxy contract with implementation ABI
      const proxy = getContract({
        address: selectedManufacturerProxy,
        abi: implementationContract.abi,
        client: { public: publicClient, wallet: walletClient },
      })

      // Call updateState
      console.log('Updating order state:', { tokenId, newState })
      const hash = await proxy.write.updateState([tokenId, newState])

      // Wait for transaction
      console.log('Waiting for transaction:', hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      console.log('✅ Order state updated')

      // Refresh factory data
      await refreshFactoryData()
    } catch (err: any) {
      console.error('Update order state error:', err)
      const errorMessage = err.message || 'Failed to update order state'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Refresh factory data after operations
   */
  const refreshFactoryData = async () => {
    // Re-load manufacturer proxies
    if (!factoryInfo) return

    try {
      const registryContract = contracts.find((c) => c.name === 'ManufacturerRegistry')
      const factoryContract = contracts.find((c) => c.name === 'LogisticsOrderFactory')
      const implementationContract = contracts.find((c) => c.name === 'LogisticsOrder')

      if (!registryContract || !factoryContract || !implementationContract) {
        return
      }

      // Import and use FactoryService to reload proxies
      const { FactoryService } = await import('@/services/factoryService')

      const factoryService = new FactoryService(
        factoryContract.address,
        factoryContract.abi,
        registryContract.address,
        registryContract.abi,
        implementationContract.abi
      )

      // Load known manufacturers (all active accounts)
      const accounts = getActiveAccounts()
      const manufacturerAddresses = accounts.map(acc => acc.address as Address)

      const proxies = await factoryService.loadAllProxies(manufacturerAddresses)
      setManufacturerProxies(proxies)

      console.log('✅ Factory data refreshed')
    } catch (err) {
      console.error('Error refreshing factory data:', err)
    }
  }

  return {
    deployProxy,
    createOrder,
    updateOrderState,
    loading,
    error,
  }
}
