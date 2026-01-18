import type { Abi, Address } from 'viem'

export interface DeployedContract {
  name: string
  address: Address
  abi: Abi
  isProxy: boolean
  implementation?: Address
  proxyType?: 'UUPS' | 'Transparent' | 'Unknown'
  sourceCode?: string
  isVerified?: boolean
}

export interface ContractFunction {
  name: string
  type: 'function'
  stateMutability: 'view' | 'pure' | 'nonpayable' | 'payable'
  inputs: FunctionInput[]
  outputs: FunctionOutput[]
}

export interface FunctionInput {
  name: string
  type: string
  internalType?: string
}

export interface FunctionOutput {
  name: string
  type: string
  internalType?: string
}

export interface DeploymentInfo {
  network: string
  chainId: number
  deployer: Address
  contracts: {
    [key: string]: Address
  }
  version?: string
  timestamp: string
}

export interface FactoryDeploymentInfo extends DeploymentInfo {
  pattern: 'factory'
  contracts: {
    ManufacturerRegistry: Address
    LogisticsOrderImplementation: Address
    LogisticsOrderFactory: Address
  }
  notes?: {
    usage?: string
    sharedImplementation?: string
    ownership?: string
  }
}

export interface Order {
  tokenId: bigint
  manufacturer: Address
  receiver: Address
  state: number
  createdAt: bigint
  ipfsHash: string
}

export interface ManufacturerProxy {
  manufacturer: Address
  manufacturerName?: string
  proxyAddress: Address
  isActive: boolean
  orderCount: bigint
}

export interface FactoryInfo {
  factoryAddress: Address
  implementation: Address
  registry: Address
  totalProxies: number
  manufacturers: ManufacturerProxy[]
}

export type DeploymentPattern = 'factory' | 'unknown'
