import type { Address } from 'viem'

export interface Model {
  id: bigint
  name: string
  parentModelId: bigint
  modelHash: string
  metadata: string
  createdAt: bigint
}

export interface ModelWithOwner extends Model {
  owner: Address
}

export interface Metrics {
  epochs: bigint
  finalLoss: bigint
  finalAccuracy: bigint
  custom: string
}

export interface TrainingRun {
  id: bigint
  inputModelId: bigint
  outputModelId: bigint
  datasetUri: string
  datasetHash: string
  hyperparamsHash: string
  metrics: Metrics
  trainer: Address
  timestamp: bigint
}
