import { useEffect } from 'react'
import { useContractStore } from '@/store/contractStore'
import { detectDeploymentPattern, isFactoryPattern } from '@/lib/deploymentDetection'
import { FactoryService } from '@/services/factoryService'
import { getActiveAccounts } from '@/lib/viem'
import { loadABI, loadABIWithSource } from './useABILoader'
import type { DeployedContract, FactoryDeploymentInfo } from '@/types/contracts'
import type { Address } from 'viem'

export function useContractLoader() {
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
        await addValidatorContract(contracts)
        await addMLModelRegistryContract(contracts)

        try {
          const { pattern, deploymentInfo } = await detectDeploymentPattern()
          setDeploymentPattern(pattern)

          if (isFactoryPattern(deploymentInfo)) {
            await loadFactoryContracts(deploymentInfo, contracts)
          }
        } catch (patternError) {
          console.warn('Error loading factory contracts (validator still available):', patternError)
        }

        if (contracts.length > 0) {
          setContracts(contracts)
        } else {
          throw new Error('No contracts loaded')
        }
      } catch (error) {
        console.error('Error loading contracts:', error)
        setError(error instanceof Error ? error.message : 'Failed to load contracts')
        if (contracts.length > 0) {
          setContracts(contracts)
        }
      } finally {
        setLoading(false)
      }
    }

    async function loadFactoryContracts(info: FactoryDeploymentInfo, contracts: DeployedContract[]) {
      const registryAbi = await loadABI('ManufacturerRegistry')
      if (registryAbi) {
        contracts.push({
          name: 'ManufacturerRegistry',
          address: info.contracts.ManufacturerRegistry,
          abi: registryAbi,
          isProxy: false,
        })
      }

      const factoryAbi = await loadABI('LogisticsOrderFactory')
      if (factoryAbi) {
        contracts.push({
          name: 'LogisticsOrderFactory',
          address: info.contracts.LogisticsOrderFactory,
          abi: factoryAbi,
          isProxy: false,
        })
      }

      const implementationAbi = await loadABI('LogisticsOrder')

      if (factoryAbi && registryAbi && implementationAbi) {
        const factoryService = new FactoryService(
          info.contracts.LogisticsOrderFactory,
          factoryAbi,
          info.contracts.ManufacturerRegistry,
          registryAbi,
          implementationAbi
        )

        const accounts = getActiveAccounts()
        const manufacturerAddresses = accounts.map(acc => acc.address as Address)
        const proxies = await factoryService.loadAllProxies(manufacturerAddresses)
        setManufacturerProxies(proxies)

        const implementation = await factoryService.getImplementation()

        setFactoryInfo({
          factoryAddress: info.contracts.LogisticsOrderFactory,
          implementation,
          registry: info.contracts.ManufacturerRegistry,
          totalProxies: proxies.filter(p => p.proxyAddress !== '0x0000000000000000000000000000000000000000').length,
          manufacturers: proxies,
        })

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

    async function addValidatorContract(contracts: DeployedContract[]) {
      try {
        const result = await loadABIWithSource('DynamicMultiSigValidatorManager')
        if (result) {
          contracts.push({
            name: 'Validator Management',
            address: '0x0000000000000000000000000000000000009999' as Address,
            abi: result.abi,
            isProxy: false,
            sourceCode: result.sourceCode,
            isVerified: !!result.sourceCode,
          })
        }
      } catch (error) {
        console.error('Error loading validator contract:', error)
      }
    }

    async function addMLModelRegistryContract(contracts: DeployedContract[]) {
      try {
        const deploymentResponse = await fetch('/deployment-mlregistry.json')
        if (!deploymentResponse.ok) {
          return
        }
        const deploymentData = await deploymentResponse.json()
        const address = deploymentData.contracts?.MLModelRegistry as Address
        if (!address) {
          return
        }

        const abi = await loadABI('MLModelRegistry')
        if (!abi) {
          return
        }

        contracts.push({
          name: 'ML Model Registry',
          address,
          abi,
          isProxy: false,
        })
      } catch (error) {
        console.error('Error loading MLModelRegistry contract:', error)
      }
    }

    loadContracts()
  }, [setContracts, setLoading, setError, setDeploymentPattern, setFactoryInfo, setManufacturerProxies])
}
