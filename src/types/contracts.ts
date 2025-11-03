import type { Abi, Address } from 'viem'

export interface DeployedContract {
  name: string
  address: Address
  abi: Abi
  isProxy: boolean
  implementation?: Address
  proxyType?: 'UUPS' | 'Transparent' | 'Unknown'
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

// Factory pattern deployment info
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
  state: number // 0: Created, 1: PickedUp, 2: InTransit, 3: AtFacility, 4: Delivered
  createdAt: bigint
  ipfsHash: string
}

// Manufacturer proxy information
export interface ManufacturerProxy {
  manufacturer: Address
  manufacturerName?: string
  proxyAddress: Address
  isActive: boolean
  orderCount: bigint
}

// Factory system information
export interface FactoryInfo {
  factoryAddress: Address
  implementation: Address
  registry: Address
  totalProxies: number
  manufacturers: ManufacturerProxy[]
}
