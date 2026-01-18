import { create } from 'zustand'
import type { Address, Abi } from 'viem'
import type { ModelWithOwner, TrainingRun } from '@/types/ml'

interface MLModelState {
  models: ModelWithOwner[]
  runs: TrainingRun[]
  loading: boolean
  error: string | null
  contractAddress: Address | null
  contractAbi: Abi | null

  setModels: (models: ModelWithOwner[]) => void
  setRuns: (runs: TrainingRun[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setContractInfo: (address: Address, abi: Abi) => void
  addModel: (model: ModelWithOwner) => void
  addRun: (run: TrainingRun) => void
}

export const useMLModelStore = create<MLModelState>((set) => ({
  models: [],
  runs: [],
  loading: false,
  error: null,
  contractAddress: null,
  contractAbi: null,

  setModels: (models) => set({ models }),

  setRuns: (runs) => set({ runs }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setContractInfo: (address, abi) => set({ contractAddress: address, contractAbi: abi }),

  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model],
    })),

  addRun: (run) =>
    set((state) => ({
      runs: [...state.runs, run],
    })),
}))
