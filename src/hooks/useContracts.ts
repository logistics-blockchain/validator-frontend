import { useEffect } from 'react'
import { useContractStore } from '@/store/contractStore'
import { detectProxy } from '@/lib/proxyDetection'
import { detectDeploymentPattern, isFactoryPattern } from '@/lib/deploymentDetection'
import { FactoryService } from '@/services/factoryService'
import { getActiveAccounts } from '@/lib/viem'
import type { DeployedContract, DeploymentInfo, FactoryDeploymentInfo } from '@/types/contracts'
import type { Address, Abi } from 'viem'

export function useContracts() {
  const {
    setContracts,
    setLoading,
    setError,
    setDeploymentPattern,
    setFactoryInfo,
    setManufacturerProxies
  } = useContractStore()

  useEffect(() => {
    const loadContracts = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1. Detect deployment pattern
        const { pattern, deploymentInfo } = await detectDeploymentPattern()
        setDeploymentPattern(pattern)

        if (!deploymentInfo) {
          throw new Error('No deployment found')
        }

        // 2. Load contracts based on pattern
        if (isFactoryPattern(deploymentInfo)) {
          await loadFactoryContracts(deploymentInfo)
        } else {
          await loadSharedProxyContracts(deploymentInfo)
        }
      } catch (error) {
        console.error('Error loading contracts:', error)
        setError(error instanceof Error ? error.message : 'Failed to load contracts')
      } finally {
        setLoading(false)
      }
    }

    // Load factory pattern contracts
    async function loadFactoryContracts(info: FactoryDeploymentInfo) {
      console.log('📦 Loading factory pattern contracts...')

      const contracts: DeployedContract[] = []

      // 1. Load ManufacturerRegistry
      const registryAbi = await loadABI('ManufacturerRegistry')
      if (registryAbi) {
        contracts.push({
          name: 'ManufacturerRegistry',
          address: info.contracts.ManufacturerRegistry,
          abi: registryAbi,
          isProxy: false,
        })
      }

      // 2. Load LogisticsOrderFactory
      const factoryAbi = await loadABI('LogisticsOrderFactory')
      if (factoryAbi) {
        contracts.push({
          name: 'LogisticsOrderFactory',
          address: info.contracts.LogisticsOrderFactory,
          abi: factoryAbi,
          isProxy: false,
        })
      }

      // 3. Load implementation ABI (for proxy interactions)
      const implementationAbi = await loadABI('LogisticsOrder')

      setContracts(contracts)

      // 4. Initialize factory service and load manufacturer proxies
      if (factoryAbi && registryAbi && implementationAbi) {
        const factoryService = new FactoryService(
          info.contracts.LogisticsOrderFactory,
          factoryAbi,
          info.contracts.ManufacturerRegistry,
          registryAbi,
          implementationAbi
        )

        // Load manufacturer proxies
        console.log('📋 Loading manufacturer proxies...')
        // Get active accounts based on current chain
        const accounts = getActiveAccounts()
        const manufacturerAddresses = accounts.map(acc => acc.address as Address)
        const proxies = await factoryService.loadAllProxies(manufacturerAddresses)
        console.log(`✅ Loaded ${proxies.length} manufacturer proxies`)
        console.log('📋 Proxies detail:', proxies.map(p => ({
          manufacturer: p.manufacturer,
          name: p.manufacturerName,
          proxy: p.proxyAddress,
          isActive: p.isActive,
          orders: p.orderCount.toString()
        })))
        setManufacturerProxies(proxies)

        // Get implementation address
        const implementation = await factoryService.getImplementation()

        // Set factory info
        setFactoryInfo({
          factoryAddress: info.contracts.LogisticsOrderFactory,
          implementation,
          registry: info.contracts.ManufacturerRegistry,
          totalProxies: proxies.filter(p => p.proxyAddress !== '0x0000000000000000000000000000000000000000').length,
          manufacturers: proxies,
        })

        // Add deployed proxies as interactable contracts
        const deployedProxies = proxies.filter(p => p.proxyAddress !== '0x0000000000000000000000000000000000000000')
        for (const proxy of deployedProxies) {
          contracts.push({
            name: `${proxy.manufacturerName || 'Manufacturer'} Proxy`,
            address: proxy.proxyAddress,
            abi: implementationAbi,
            isProxy: true,
            proxyType: 'UUPS',
            implementation,
          })
        }

        setContracts(contracts)
      }
    }

    // Load shared proxy pattern contracts (existing logic)
    async function loadSharedProxyContracts(deploymentInfo: DeploymentInfo) {
      console.log('📦 Loading shared proxy pattern contracts...')

      const contractPromises = Object.entries(deploymentInfo.contracts)
        .filter(([name]) => !name.includes('Implementation'))
        .map(async ([name, address]) => {
          try {
            const abiResponse = await fetch(`/artifacts/${name}.json`)
            let abi: Abi = []

            if (abiResponse.ok) {
              const artifactData = await abiResponse.json()
              abi = artifactData.abi
            }

            const proxyInfo = await detectProxy(address)

            const contract: DeployedContract = {
              name,
              address: address as Address,
              abi,
              isProxy: proxyInfo.isProxy,
              implementation: proxyInfo.implementation,
              proxyType: proxyInfo.proxyType,
            }

            if (proxyInfo.isProxy && proxyInfo.implementation) {
              const implNames = [
                name.replace('Proxy', ''),
                name.replace('Proxy', 'V1'),
                name.replace('Proxy', 'V2'),
                name.replace('Proxy', 'Implementation'),
                'LogisticsOrder',
                'LogisticsOrderV1',
                'LogisticsOrderV2',
              ]

              for (const implName of implNames) {
                try {
                  const implResponse = await fetch(`/artifacts/${implName}.json`)
                  if (implResponse.ok) {
                    const implArtifact = await implResponse.json()
                    contract.abi = implArtifact.abi
                    console.log(`✅ Loaded implementation ABI for ${name} from ${implName}`)
                    break
                  }
                } catch (error) {
                  console.log(`Could not load ${implName}.json, trying next...`)
                }
              }
            }

            return contract
          } catch (error) {
            console.error(`Error loading contract ${name}:`, error)
            return null
          }
        })

      const contracts = (await Promise.all(contractPromises)).filter(
        (c): c is DeployedContract => c !== null
      )

      setContracts(contracts)
    }

    loadContracts()
  }, [setContracts, setLoading, setError, setDeploymentPattern, setFactoryInfo, setManufacturerProxies])
}

// Helper to load ABI
async function loadABI(contractName: string): Promise<Abi | null> {
  try {
    const response = await fetch(`/artifacts/${contractName}.json`)
    if (response.ok) {
      const artifact = await response.json()
      return artifact.abi as Abi
    }
    return null
  } catch (error) {
    console.error(`Error loading ABI for ${contractName}:`, error)
    return null
  }
}
