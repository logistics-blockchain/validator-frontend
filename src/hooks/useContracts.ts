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

      const contracts: DeployedContract[] = []

      try {
        // 1. ALWAYS load validator contract first (genesis contract at 0x9999)
        await addValidatorContract(contracts)

        // 2. Load MLModelRegistry if deployed
        await addMLModelRegistryContract(contracts)

        // 3. Try to detect and load deployment pattern contracts
        try {
          const { pattern, deploymentInfo } = await detectDeploymentPattern()
          setDeploymentPattern(pattern)

          if (deploymentInfo) {
            // Load contracts based on pattern
            if (isFactoryPattern(deploymentInfo)) {
              await loadFactoryContracts(deploymentInfo, contracts)
            } else {
              await loadSharedProxyContracts(deploymentInfo, contracts)
            }
          }
        } catch (patternError) {
          console.warn('Error loading pattern contracts (validator still available):', patternError)
          // Don't throw - validator contract is still loaded
        }

        // Set contracts even if pattern loading failed
        if (contracts.length > 0) {
          setContracts(contracts)
        } else {
          throw new Error('No contracts loaded')
        }
      } catch (error) {
        console.error('Error loading contracts:', error)
        setError(error instanceof Error ? error.message : 'Failed to load contracts')
        // Still try to set validator contract if we have it
        if (contracts.length > 0) {
          setContracts(contracts)
        }
      } finally {
        setLoading(false)
      }
    }

    // Load factory pattern contracts
    async function loadFactoryContracts(info: FactoryDeploymentInfo, contracts: DeployedContract[]) {
      console.log('📦 Loading factory pattern contracts...')

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
      }
    }

    // Load shared proxy pattern contracts (existing logic)
    async function loadSharedProxyContracts(deploymentInfo: DeploymentInfo, contracts: DeployedContract[]) {
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

      const loadedContracts = (await Promise.all(contractPromises)).filter(
        (c): c is DeployedContract => c !== null
      )

      contracts.push(...loadedContracts)
    }

    // Add validator contract manually (genesis contract)
    async function addValidatorContract(contracts: DeployedContract[]) {
      try {
        const response = await fetch('/artifacts/DynamicMultiSigValidatorManager.json')
        if (response.ok) {
          const artifact = await response.json()
          contracts.push({
            name: 'Validator Management',
            address: '0x0000000000000000000000000000000000009999' as Address,
            abi: artifact.abi as Abi,
            isProxy: false,
            sourceCode: artifact.sourceCode,
            isVerified: !!artifact.sourceCode,
          })
          console.log('✅ Added Validator Management contract' + (artifact.sourceCode ? ' with verified source code' : ''))
        }
      } catch (error) {
        console.error('Error loading validator contract:', error)
      }
    }

    // Add MLModelRegistry contract if deployed
    async function addMLModelRegistryContract(contracts: DeployedContract[]) {
      try {
        // Load deployment info to get address
        const deploymentResponse = await fetch('/deployment-mlregistry.json')
        if (!deploymentResponse.ok) {
          console.log('MLModelRegistry not deployed (no deployment file)')
          return
        }
        const deploymentData = await deploymentResponse.json()
        const address = deploymentData.contracts?.MLModelRegistry as Address
        if (!address) {
          console.log('MLModelRegistry address not found in deployment')
          return
        }

        // Load ABI
        const abiResponse = await fetch('/artifacts/MLModelRegistry.json')
        if (!abiResponse.ok) {
          console.log('MLModelRegistry ABI not found')
          return
        }
        const artifact = await abiResponse.json()

        contracts.push({
          name: 'ML Model Registry',
          address,
          abi: artifact.abi as Abi,
          isProxy: false,
        })
        console.log('✅ Added ML Model Registry contract at', address)
      } catch (error) {
        console.error('Error loading MLModelRegistry contract:', error)
      }
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
