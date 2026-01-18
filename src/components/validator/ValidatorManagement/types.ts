import type { Address } from 'viem'

export interface AdminProposal {
  id: number
  candidate: Address
  isAddition: boolean
  executed: boolean
  createdAt: bigint
  signatures: Address[]
  signatureCount: number
}

export interface ValidatorProposal {
  id: number
  candidate: Address
  isApproval: boolean
  executed: boolean
  createdAt: bigint
  reason: string
  signatures: Address[]
  signatureCount: number
}

export interface TransactionStatusData {
  type: 'add_validator' | 'remove_validator' | 'add_admin' | 'sign_proposal' | 'approve_validator'
  status: 'pending' | 'success' | 'error'
  hash?: string
  blockNumber?: string
  gasUsed?: string
  error?: string
  target?: Address
}

export const VALIDATOR_CONTRACT = '0x0000000000000000000000000000000000009999' as Address
