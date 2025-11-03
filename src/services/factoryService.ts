import { publicClient } from '@/lib/viem'
import type { Address, Abi } from 'viem'
import type { ManufacturerProxy } from '@/types/contracts'

/**
 * Factory Service
 * Handles interactions with LogisticsOrderFactory contract
 */
export class FactoryService {
  constructor(
    private factoryAddress: Address,
    private factoryAbi: Abi,
    private registryAddress: Address,
    private registryAbi: Abi,
    private implementationAbi: Abi
  ) {}

  /**
   * Check if a manufacturer has deployed a proxy
   */
  async hasContract(manufacturer: Address): Promise<boolean> {
    try {
      const result = await publicClient.readContract({
        address: this.factoryAddress,
        abi: this.factoryAbi,
        functionName: 'hasContract',
        args: [manufacturer],
      })
      return result as boolean
    } catch (error) {
      console.error('Error checking hasContract:', error)
      return false
    }
  }

  /**
   * Get manufacturer's proxy contract address
   */
  async getManufacturerContract(manufacturer: Address): Promise<Address | null> {
    try {
      const result = await publicClient.readContract({
        address: this.factoryAddress,
        abi: this.factoryAbi,
        functionName: 'getManufacturerContract',
        args: [manufacturer],
      })
      const address = result as Address

      // Return null if it's the zero address
      if (address === '0x0000000000000000000000000000000000000000') {
        return null
      }

      return address
    } catch (error) {
      console.error('Error getting manufacturer contract:', error)
      return null
    }
  }

  /**
   * Get the shared implementation address
   */
  async getImplementation(): Promise<Address> {
    const result = await publicClient.readContract({
      address: this.factoryAddress,
      abi: this.factoryAbi,
      functionName: 'getImplementation',
    })
    return result as Address
  }

  /**
   * Get the registry address
   */
  async getRegistry(): Promise<Address> {
    const result = await publicClient.readContract({
      address: this.factoryAddress,
      abi: this.factoryAbi,
      functionName: 'getRegistry',
    })
    return result as Address
  }

  /**
   * Check if an address is a registered manufacturer
   */
  async isRegistered(address: Address): Promise<boolean> {
    try {
      const result = await publicClient.readContract({
        address: this.registryAddress,
        abi: this.registryAbi,
        functionName: 'isRegistered',
        args: [address],
      })
      return result as boolean
    } catch (error) {
      console.error('Error checking isRegistered:', error)
      return false
    }
  }

  /**
   * Get manufacturer details from registry
   */
  async getManufacturer(address: Address): Promise<{ addr: Address; name: string; isActive: boolean } | null> {
    try {
      const result = await publicClient.readContract({
        address: this.registryAddress,
        abi: this.registryAbi,
        functionName: 'getManufacturer',
        args: [address],
      }) as any

      // Check if manufacturer exists
      if (result && result.addr && result.addr !== '0x0000000000000000000000000000000000000000') {
        return {
          addr: result.addr as Address,
          name: result.name as string,
          isActive: result.isActive as boolean,
        }
      }
      return null
    } catch (error) {
      console.error('Error getting manufacturer:', error)
      return null
    }
  }

  /**
   * Get order count for a proxy contract
   */
  async getOrderCount(proxyAddress: Address): Promise<bigint> {
    try {
      const result = await publicClient.readContract({
        address: proxyAddress,
        abi: this.implementationAbi,
        functionName: 'getTotalSupply',
      })
      return result as bigint
    } catch (error) {
      console.error('Error getting order count:', error)
      return 0n
    }
  }

  /**
   * Load information about a specific manufacturer's proxy
   */
  async loadManufacturerProxy(manufacturer: Address): Promise<ManufacturerProxy | null> {
    try {
      // Check if manufacturer is registered
      const isReg = await this.isRegistered(manufacturer)
      if (!isReg) {
        return null
      }

      // Get manufacturer details
      const mfrDetails = await this.getManufacturer(manufacturer)
      if (!mfrDetails) {
        return null
      }

      // Check if they have a proxy
      const hasProxy = await this.hasContract(manufacturer)
      if (!hasProxy) {
        return {
          manufacturer,
          manufacturerName: mfrDetails.name,
          proxyAddress: '0x0000000000000000000000000000000000000000' as Address,
          isActive: mfrDetails.isActive,
          orderCount: 0n,
        }
      }

      // Get proxy address
      const proxyAddress = await this.getManufacturerContract(manufacturer)
      if (!proxyAddress) {
        return {
          manufacturer,
          manufacturerName: mfrDetails.name,
          proxyAddress: '0x0000000000000000000000000000000000000000' as Address,
          isActive: mfrDetails.isActive,
          orderCount: 0n,
        }
      }

      // Get order count
      const orderCount = await this.getOrderCount(proxyAddress)

      return {
        manufacturer,
        manufacturerName: mfrDetails.name,
        proxyAddress,
        isActive: mfrDetails.isActive,
        orderCount,
      }
    } catch (error) {
      console.error('Error loading manufacturer proxy:', error)
      return null
    }
  }

  /**
   * Load all manufacturer proxies
   * Note: This is a simplified version that tries common test accounts
   * In production, you'd listen to ProxyDeployed events to get all manufacturers
   */
  async loadAllProxies(knownManufacturers: Address[]): Promise<ManufacturerProxy[]> {
    const proxies: ManufacturerProxy[] = []

    for (const manufacturer of knownManufacturers) {
      const proxy = await this.loadManufacturerProxy(manufacturer)
      if (proxy) {
        proxies.push(proxy)
      }
    }

    return proxies
  }

  /**
   * Listen for ProxyDeployed events (for automatic updates)
   */
  watchProxyDeployedEvents(callback: (manufacturer: Address, proxyAddress: Address) => void) {
    return publicClient.watchContractEvent({
      address: this.factoryAddress,
      abi: this.factoryAbi,
      eventName: 'ProxyDeployed',
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          if (log.args?.manufacturer && log.args?.proxyAddress) {
            callback(log.args.manufacturer as Address, log.args.proxyAddress as Address)
          }
        })
      },
    })
  }
}
