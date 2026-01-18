import { useEffect, useState } from 'react'
import { useMLModelStore } from '@/store/mlModelStore'
import { useAccountStore, selectCurrentAccount, selectCurrentAccountIndex } from '@/store/accountStore'
import { createWalletClientForAccount, publicClient } from '@/lib/viem'
import { getContract } from 'viem'
import type { Address, Abi } from 'viem'
import type { ModelWithOwner, TrainingRun, Model } from '@/types/ml'

export function useMLModels() {
  const [initialized, setInitialized] = useState(false)
  const {
    models,
    runs,
    loading,
    error,
    contractAddress,
    contractAbi,
    setModels,
    setRuns,
    setLoading,
    setError,
    setContractInfo,
  } = useMLModelStore()

  const currentAccount = useAccountStore(selectCurrentAccount)
  const currentAccountIndex = useAccountStore(selectCurrentAccountIndex)

  useEffect(() => {
    if (!initialized) {
      loadContractAndData()
    }
  }, [initialized])

  const loadContractAndData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load ABI from artifacts
      const abiResponse = await fetch('/artifacts/MLModelRegistry.json')
      if (!abiResponse.ok) {
        throw new Error('Failed to load MLModelRegistry ABI')
      }
      const abiData = await abiResponse.json()
      const abi = abiData.abi as Abi

      // Load deployment info
      const deploymentResponse = await fetch('/deployment-mlregistry.json')
      if (!deploymentResponse.ok) {
        throw new Error('Failed to load deployment info - contract may not be deployed yet')
      }
      const deploymentData = await deploymentResponse.json()
      const address = deploymentData.contracts.MLModelRegistry as Address

      if (!address) {
        throw new Error('MLModelRegistry address not found in deployment info')
      }

      setContractInfo(address, abi)

      await fetchAllData(address, abi)
      setInitialized(true)
    } catch (err: any) {
      console.error('Error loading ML contract:', err)
      setError(err.message || 'Failed to load ML Model Registry')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async (address: Address, abi: Abi) => {
    try {
      // Get total counts
      const totalModels = (await publicClient.readContract({
        address,
        abi,
        functionName: 'getTotalModels',
      })) as bigint

      if (totalModels === 0n) {
        setModels([])
        setRuns([])
        return
      }

      // Fetch models in batches of 100
      const allModels: Model[] = []
      let startId = 1n
      while (startId <= totalModels) {
        const batchSize = 100n
        const batch = (await publicClient.readContract({
          address,
          abi,
          functionName: 'getModelBatch',
          args: [startId, batchSize],
        })) as Model[]

        // Filter out empty models (id = 0)
        const validModels = batch.filter((m) => m.id > 0n)
        allModels.push(...validModels)
        startId += batchSize
      }

      // Fetch owners in parallel
      const ownerPromises = allModels.map((model) =>
        publicClient.readContract({
          address,
          abi,
          functionName: 'ownerOf',
          args: [model.id],
        })
      )
      const owners = (await Promise.all(ownerPromises)) as Address[]

      const modelsWithOwners: ModelWithOwner[] = allModels.map((model, index) => ({
        ...model,
        owner: owners[index],
      }))

      setModels(modelsWithOwners)

      // Fetch training runs
      const totalRuns = (await publicClient.readContract({
        address,
        abi,
        functionName: 'getTotalRuns',
      })) as bigint

      if (totalRuns > 0n) {
        const allRuns: TrainingRun[] = []
        let runStartId = 1n
        while (runStartId <= totalRuns) {
          const batchSize = 100n
          const batch = (await publicClient.readContract({
            address,
            abi,
            functionName: 'getRunBatch',
            args: [runStartId, batchSize],
          })) as TrainingRun[]

          const validRuns = batch.filter((r) => r.id > 0n)
          allRuns.push(...validRuns)
          runStartId += batchSize
        }
        setRuns(allRuns)
      } else {
        setRuns([])
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      throw err
    }
  }

  const registerBaseModel = async (
    name: string,
    modelHash: string,
    metadata: string
  ): Promise<bigint> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!contractAddress || !contractAbi) {
      throw new Error('Contract not loaded')
    }

    setLoading(true)
    setError(null)

    try {
      const walletClient = createWalletClientForAccount(currentAccountIndex)

      const contract = getContract({
        address: contractAddress,
        abi: contractAbi,
        client: { public: publicClient, wallet: walletClient },
      })

      console.log('Registering base model:', { name, modelHash, metadata })
      const hash = await contract.write.registerBaseModel([name, modelHash, metadata], {
        gasPrice: 0n,
        gas: 500000n,
      })

      console.log('Waiting for transaction:', hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      // Get the new model ID
      const modelId = (await contract.read.getTotalModels()) as bigint
      console.log('Base model registered with ID:', modelId)

      await refresh()

      return modelId
    } catch (err: any) {
      console.error('Register base model error:', err)
      const errorMessage = err.message || 'Failed to register base model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const registerTrainingRun = async (
    inputModelId: bigint,
    outputModelName: string,
    outputModelHash: string,
    outputMetadata: string,
    datasetUri: string,
    datasetHash: string,
    hyperparamsHash: string,
    epochs: bigint,
    finalLoss: bigint,
    finalAccuracy: bigint,
    customMetrics: string
  ): Promise<{ runId: bigint; outputModelId: bigint }> => {
    if (!currentAccount || currentAccountIndex === null) {
      throw new Error('No account connected')
    }

    if (!contractAddress || !contractAbi) {
      throw new Error('Contract not loaded')
    }

    setLoading(true)
    setError(null)

    try {
      const walletClient = createWalletClientForAccount(currentAccountIndex)

      const contract = getContract({
        address: contractAddress,
        abi: contractAbi,
        client: { public: publicClient, wallet: walletClient },
      })

      console.log('Registering training run:', {
        inputModelId,
        outputModelName,
        datasetUri,
      })

      // Contract expects: (TrainingRunInput calldata input, Metrics calldata metrics)
      // TrainingRunInput: { inputModelId, outputName, outputHash, outputMetadata, datasetUri, datasetHash, hyperparamsHash }
      // Metrics: { epochs, finalLoss, finalAccuracy, custom }
      const input = {
        inputModelId,
        outputName: outputModelName,
        outputHash: outputModelHash,
        outputMetadata,
        datasetUri,
        datasetHash,
        hyperparamsHash,
      }

      const metrics = {
        epochs,
        finalLoss,
        finalAccuracy,
        custom: customMetrics,
      }

      const hash = await contract.write.registerTrainingRun([input, metrics], {
        gasPrice: 0n,
        gas: 800000n,
      })

      console.log('Waiting for transaction:', hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      const runId = (await contract.read.getTotalRuns()) as bigint
      const outputModelId = (await contract.read.getTotalModels()) as bigint
      console.log('Training run registered:', { runId, outputModelId })

      await refresh()

      return { runId, outputModelId }
    } catch (err: any) {
      console.error('Register training run error:', err)
      const errorMessage = err.message || 'Failed to register training run'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    if (!contractAddress || !contractAbi) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await fetchAllData(contractAddress, contractAbi)
    } catch (err: any) {
      console.error('Error refreshing data:', err)
      setError(err.message || 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  return {
    models,
    runs,
    loading,
    error,
    registerBaseModel,
    registerTrainingRun,
    refresh,
    contractAddress,
  }
}
