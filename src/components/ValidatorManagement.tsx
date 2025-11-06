import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { AddressLink } from './AddressLink'
import { publicClient, createWalletClientForAccount, getActiveAccounts } from '@/lib/viem'
import { parseAbi, type Address, type Abi } from 'viem'
import { formatAddress } from '@/lib/utils'

const VALIDATOR_CONTRACT = '0x0000000000000000000000000000000000009999' as Address

interface AdminProposal {
  id: number
  candidate: Address
  isAddition: boolean
  executed: boolean
  createdAt: bigint
  signatures: Address[]
  signatureCount: number
}

interface ValidatorProposal {
  id: number
  candidate: Address
  isApproval: boolean
  executed: boolean
  createdAt: bigint
  reason: string
  signatures: Address[]
  signatureCount: number
}

interface TransactionStatus {
  type: 'add_validator' | 'remove_validator' | 'add_admin' | 'sign_proposal' | 'approve_validator'
  status: 'pending' | 'success' | 'error'
  hash?: string
  blockNumber?: string
  gasUsed?: string
  error?: string
  target?: Address
}

export function ValidatorManagement() {
  const [newValidatorAddress, setNewValidatorAddress] = useState('')
  const [removeValidatorAddress, setRemoveValidatorAddress] = useState('')
  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [currentValidators, setCurrentValidators] = useState<Address[]>([])
  const [currentAdmins, setCurrentAdmins] = useState<Address[]>([])
  const [pendingApplications, setPendingApplications] = useState<Address[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCount, setAdminCount] = useState<number | null>(null)
  const [validatorCount, setValidatorCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(0)
  const [contractAbi, setContractAbi] = useState<Abi | null>(null)
  const [abiLoadError, setAbiLoadError] = useState<string | null>(null)
  const [pendingAdminProposals, setPendingAdminProposals] = useState<AdminProposal[]>([])
  const [completedAdminProposals, setCompletedAdminProposals] = useState<AdminProposal[]>([])
  const [pendingValidatorProposals, setPendingValidatorProposals] = useState<ValidatorProposal[]>([])
  const [completedValidatorProposals, setCompletedValidatorProposals] = useState<ValidatorProposal[]>([])
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null)

  // Load contract ABI
  useEffect(() => {
    fetch('/artifacts/DynamicMultiSigValidatorManager.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then(data => {
        console.log('Contract ABI loaded successfully')
        setContractAbi(data.abi as Abi)
        setAbiLoadError(null)
      })
      .catch(err => {
        const errMsg = `Failed to load contract ABI: ${err.message}`
        console.error('CRITICAL:', errMsg)
        setAbiLoadError(errMsg)
      })
  }, [])

  useEffect(() => {
    if (!contractAbi) return
    loadContractState()
    const interval = setInterval(loadContractState, 5000)
    return () => clearInterval(interval)
  }, [selectedAccount, contractAbi])

  const loadContractState = async () => {
    if (!contractAbi) return
    try {
      // Get validators
      const validators = await publicClient.readContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'getValidators',
      }) as Address[]
      setCurrentValidators(validators)
      setValidatorCount(validators.length)

      // Get pending applications
      try {
        const pending = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi: contractAbi,
          functionName: 'getPendingValidators',
        }) as Address[]
        setPendingApplications(pending)
      } catch (pendingError) {
        setPendingApplications([])
      }

      // Get admins
      try {
        const admins = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi: contractAbi,
          functionName: 'getAdmins',
        }) as Address[]
        setCurrentAdmins(admins)
        setAdminCount(admins.length)
      } catch (adminError) {
        console.error('Error loading admins:', adminError)
        setCurrentAdmins([])
        setAdminCount(1)
      }

      // Check if current account is admin
      const walletClient = createWalletClientForAccount(selectedAccount)
      const adminStatus = await publicClient.readContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'isAdmin',
        args: [walletClient.account.address],
      }) as boolean
      setIsAdmin(adminStatus)

      // Load pending admin proposals and validator proposals
      await loadAdminProposals()
      await loadValidatorProposals()
    } catch (error) {
      console.error('Error loading contract state:', error)
    }
  }

  const loadAdminProposals = async () => {
    if (!contractAbi) return

    try {
      const pending: AdminProposal[] = []
      const completed: AdminProposal[] = []

      for (let i = 0; i < 20; i++) {
        try {
          const proposal = await publicClient.readContract({
            address: VALIDATOR_CONTRACT,
            abi: contractAbi,
            functionName: 'adminProposals',
            args: [BigInt(i)],
          }) as [Address, boolean, boolean, bigint]

          const [candidate, isAddition, executed, createdAt] = proposal

          if (candidate !== '0x0000000000000000000000000000000000000000') {
            const signatures = await publicClient.readContract({
              address: VALIDATOR_CONTRACT,
              abi: contractAbi,
              functionName: 'getAdminProposalSignatures',
              args: [BigInt(i)],
            }) as Address[]

            const proposalData: AdminProposal = {
              id: i,
              candidate,
              isAddition,
              executed,
              createdAt,
              signatures,
              signatureCount: signatures.length,
            }

            if (executed) {
              completed.push(proposalData)
            } else {
              pending.push(proposalData)
            }
          }
        } catch (err) {
          continue
        }
      }

      setPendingAdminProposals(pending)
      setCompletedAdminProposals(completed)
    } catch (error) {
      console.error('ERROR loading admin proposals:', error)
      setPendingAdminProposals([])
      setCompletedAdminProposals([])
    }
  }

  const loadValidatorProposals = async () => {
    if (!contractAbi) return

    try {
      const pending: ValidatorProposal[] = []
      const completed: ValidatorProposal[] = []

      for (let i = 0; i < 20; i++) {
        try {
          const proposal = await publicClient.readContract({
            address: VALIDATOR_CONTRACT,
            abi: contractAbi,
            functionName: 'validatorProposals',
            args: [BigInt(i)],
          }) as [Address, boolean, boolean, string, bigint]

          const [candidate, isApproval, executed, reason, createdAt] = proposal

          if (candidate !== '0x0000000000000000000000000000000000000000') {
            const signatures = await publicClient.readContract({
              address: VALIDATOR_CONTRACT,
              abi: contractAbi,
              functionName: 'getValidatorProposalSignatures',
              args: [BigInt(i)],
            }) as Address[]

            const proposalData: ValidatorProposal = {
              id: i,
              candidate,
              isApproval,
              executed,
              createdAt,
              reason,
              signatures,
              signatureCount: signatures.length,
            }

            if (executed) {
              completed.push(proposalData)
            } else {
              pending.push(proposalData)
            }
          }
        } catch (err) {
          continue
        }
      }

      setPendingValidatorProposals(pending)
      setCompletedValidatorProposals(completed)
    } catch (error) {
      console.error('ERROR loading validator proposals:', error)
      setPendingValidatorProposals([])
      setCompletedValidatorProposals([])
    }
  }

  const handleAddValidator = async () => {
    if (!contractAbi) return
    if (!newValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(newValidatorAddress)) {
      setTxStatus({
        type: 'add_validator',
        status: 'error',
        error: 'Please enter a valid Ethereum address',
        target: newValidatorAddress as Address
      })
      return
    }

    setLoading(true)
    setTxStatus({ type: 'add_validator', status: 'pending', target: newValidatorAddress as Address })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeApproval',
        args: [newValidatorAddress as Address, ''],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      setTxStatus({
        type: 'add_validator',
        status: 'success',
        hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        target: newValidatorAddress as Address
      })

      setNewValidatorAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error proposing validator approval:', error)
      setTxStatus({
        type: 'add_validator',
        status: 'error',
        error: error.message || 'Failed to propose validator approval',
        target: newValidatorAddress as Address
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveValidator = async () => {
    if (!contractAbi) return
    if (!removeValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(removeValidatorAddress)) {
      setTxStatus({
        type: 'remove_validator',
        status: 'error',
        error: 'Please enter a valid Ethereum address',
        target: removeValidatorAddress as Address
      })
      return
    }

    setLoading(true)
    setTxStatus({ type: 'remove_validator', status: 'pending', target: removeValidatorAddress as Address })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeRemoval',
        args: [removeValidatorAddress as Address, ''],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      setTxStatus({
        type: 'remove_validator',
        status: 'success',
        hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        target: removeValidatorAddress as Address
      })

      setRemoveValidatorAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error proposing validator removal:', error)
      setTxStatus({
        type: 'remove_validator',
        status: 'error',
        error: error.message || 'Failed to propose validator removal',
        target: removeValidatorAddress as Address
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveValidator = async (validator: Address) => {
    if (!contractAbi) return
    setLoading(true)
    setTxStatus({ type: 'approve_validator', status: 'pending', target: validator })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeApproval',
        args: [validator, ''],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      setTxStatus({
        type: 'approve_validator',
        status: 'success',
        hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        target: validator
      })

      loadContractState()
    } catch (error: any) {
      console.error('Error approving validator:', error)
      setTxStatus({
        type: 'approve_validator',
        status: 'error',
        error: error.message || 'Failed to approve validator',
        target: validator
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!contractAbi) return
    if (!newAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      setTxStatus({
        type: 'add_admin',
        status: 'error',
        error: 'Please enter a valid Ethereum address',
        target: newAdminAddress as Address
      })
      return
    }

    setLoading(true)
    setTxStatus({ type: 'add_admin', status: 'pending', target: newAdminAddress as Address })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeAddAdmin',
        args: [newAdminAddress as Address],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      setTxStatus({
        type: 'add_admin',
        status: 'success',
        hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        target: newAdminAddress as Address
      })

      setNewAdminAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error adding admin:', error)
      setTxStatus({
        type: 'add_admin',
        status: 'error',
        error: error.message || 'Failed to add admin',
        target: newAdminAddress as Address
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignProposal = async (proposalId: number, candidateAddress: Address) => {
    if (!contractAbi) return

    setLoading(true)
    setTxStatus({ type: 'sign_proposal', status: 'pending', target: candidateAddress })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'signAdminProposal',
        args: [BigInt(proposalId)],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      setTxStatus({
        type: 'sign_proposal',
        status: 'success',
        hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        target: candidateAddress
      })

      loadContractState()
    } catch (error: any) {
      console.error('Error signing proposal:', error)
      setTxStatus({
        type: 'sign_proposal',
        status: 'error',
        error: error.message || 'Failed to sign proposal',
        target: candidateAddress
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Validator Management</CardTitle>
          <div className="flex gap-2 items-center">
            <Badge variant={isAdmin ? 'success' : 'outline'}>
              {isAdmin ? 'Admin' : 'Non-Admin'}
            </Badge>
            <span className="text-sm text-gray-500">
              {adminCount === null ? 'Loading...' : `${adminCount} Admin${adminCount !== 1 ? 's' : ''}`} • {validatorCount === null ? 'Loading...' : `${validatorCount} Validator${validatorCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* ABI Load Error */}
        {abiLoadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-800 font-semibold">Failed to Initialize Contract Interface</p>
            <p className="text-xs text-red-600 mt-1">{abiLoadError}</p>
            <p className="text-xs text-red-600 mt-1">Validator management functions will not be available.</p>
          </div>
        )}

        {/* Contract Info - Moved to top */}
        <div className="grid grid-cols-[150px_1fr] gap-y-3 text-sm mb-6">
          <div className="text-gray-500">Contract:</div>
          <div className="text-xs">
            <AddressLink address={VALIDATOR_CONTRACT} showFull />
          </div>

          <div className="text-gray-500">Quorum:</div>
          <div className="font-medium">
            {adminCount > 1
              ? `${Math.floor(adminCount / 2) + 1}/${adminCount} admin signatures required`
              : 'Single admin (instant approval)'}
          </div>
        </div>

        {/* Transaction Status Display */}
        {txStatus && (
          <div className={`p-4 rounded-md border ${
            txStatus.status === 'success' ? 'bg-green-50 border-green-200' :
            txStatus.status === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm font-semibold ${
                txStatus.status === 'success' ? 'text-green-800' :
                txStatus.status === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {txStatus.type === 'add_validator' && 'Add Validator Proposal'}
                {txStatus.type === 'remove_validator' && 'Remove Validator Proposal'}
                {txStatus.type === 'add_admin' && 'Add Admin Proposal'}
                {txStatus.type === 'sign_proposal' && 'Sign Admin Proposal'}
                {txStatus.type === 'approve_validator' && 'Approve Validator'}
              </div>
              <Badge variant={
                txStatus.status === 'success' ? 'success' :
                txStatus.status === 'error' ? 'destructive' :
                'default'
              }>
                {txStatus.status}
              </Badge>
            </div>

            {txStatus.target && (
              <div className="text-xs text-gray-600 mb-2">
                Target: <AddressLink address={txStatus.target} />
              </div>
            )}

            {txStatus.status === 'success' && (
              <div className="text-xs space-y-1 font-mono">
                <div>Hash: {txStatus.hash}</div>
                <div>Block: {txStatus.blockNumber}</div>
                <div>Gas Used: {txStatus.gasUsed}</div>
              </div>
            )}

            {txStatus.status === 'error' && (
              <div className="text-xs text-red-700">{txStatus.error}</div>
            )}

            {txStatus.status === 'pending' && (
              <div className="text-xs text-blue-700">Transaction pending...</div>
            )}
          </div>
        )}

        {/* Account Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Acting As Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getActiveAccounts().map((account, index) => (
              <option key={account.address} value={index}>
                Account #{index}: {formatAddress(account.address)}
              </option>
            ))}
          </select>
        </div>

        {/* ==================== ADMIN MANAGEMENT SECTION ==================== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-blue-200">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Current Admins */}
            <div className="space-y-6">
              {/* Current Admins */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Admins ({currentAdmins.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {currentAdmins.map((admin, index) => (
                    <div key={admin} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="text-sm">
                          <AddressLink address={admin} />
                        </div>
                        <div className="text-xs text-gray-500">Admin #{index + 1}</div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Admin Actions and Proposals */}
            <div className="space-y-6">
              {/* Add New Admin */}
              {isAdmin && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Admin</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAdminAddress}
                      onChange={(e) => setNewAdminAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <Button
                      onClick={handleAddAdmin}
                      disabled={loading || !newAdminAddress}
                    >
                      {loading ? 'Adding...' : 'Add Admin'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin Proposals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Admin Proposals ({pendingAdminProposals.length} pending)
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {pendingAdminProposals.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                <p className="text-sm text-gray-500">No pending admin proposals</p>
              </div>
            ) : (
              pendingAdminProposals.map((proposal) => {
                const threshold = Math.floor(currentAdmins.length / 2) + 1
                const walletClient = createWalletClientForAccount(selectedAccount)
                const hasSignedProposal = proposal.signatures.some(
                  sig => sig.toLowerCase() === walletClient.account.address.toLowerCase()
                )
                const createdDate = new Date(Number(proposal.createdAt) * 1000)

                return (
                  <div key={proposal.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-600">Proposal #{proposal.id}</span>
                          <Badge variant="warning">Pending</Badge>
                          <Badge variant={proposal.isAddition ? 'default' : 'destructive'}>
                            {proposal.isAddition ? 'Add' : 'Remove'}
                          </Badge>
                        </div>
                        <div className="text-sm mb-2">
                          <AddressLink address={proposal.candidate} />
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>Signatures: {proposal.signatureCount}/{threshold} required</div>
                          <div className="mt-1">
                            Signed by: {proposal.signatures.length > 0
                              ? proposal.signatures.map(s => s.slice(0, 8) + '...').join(', ')
                              : 'None'}
                          </div>
                          <div className="mt-1 text-gray-500">
                            Created: {createdDate.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {isAdmin && !hasSignedProposal && (
                        <Button
                          onClick={() => handleSignProposal(proposal.id, proposal.candidate)}
                          disabled={loading}
                          size="sm"
                          variant="default"
                        >
                          Sign
                        </Button>
                      )}
                      {isAdmin && hasSignedProposal && (
                        <Badge variant="success">Signed</Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

            {/* Completed Admin Proposals */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Completed Admin Proposals ({completedAdminProposals.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {completedAdminProposals.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-500">No completed admin proposals</p>
                  </div>
                ) : (
                  completedAdminProposals.slice().reverse().map((proposal) => {
                    const createdDate = new Date(Number(proposal.createdAt) * 1000)

                    return (
                      <div key={proposal.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-600">Proposal #{proposal.id}</span>
                              <Badge variant="success">Executed</Badge>
                              <Badge variant={proposal.isAddition ? 'default' : 'destructive'}>
                                {proposal.isAddition ? 'Add' : 'Remove'}
                              </Badge>
                            </div>
                            <div className="text-sm mb-2">
                              <AddressLink address={proposal.candidate} />
                            </div>
                            <div className="text-xs text-gray-600">
                              <div>Signatures: {proposal.signatureCount}</div>
                              <div className="mt-1">
                                Signed by: {proposal.signatures.length > 0
                                  ? proposal.signatures.map(s => s.slice(0, 8) + '...').join(', ')
                                  : 'None'}
                              </div>
                              <div className="mt-1 text-gray-500">
                                Created: {createdDate.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* ==================== VALIDATOR MANAGEMENT SECTION ==================== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-green-200">
            <div className="h-8 w-1 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Validator Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Current Validators */}
            <div className="space-y-6">
              {/* Current Validators */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Validators ({currentValidators.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {currentValidators.map((validator, index) => (
                    <div key={validator} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="text-sm">
                          <AddressLink address={validator} />
                        </div>
                        <div className="text-xs text-gray-500">Validator #{index + 1}</div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Validator Actions and Proposals */}
            <div className="space-y-6">
            {/* Validator Applications Awaiting Review */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Validator Applications Awaiting Review ({pendingApplications.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingApplications.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-500">No pending validator applications</p>
                  </div>
                ) : (
                  pendingApplications.map((validator) => (
                    <div key={validator} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                      <div className="text-sm">
                        <AddressLink address={validator} />
                      </div>
                      {isAdmin && (
                        <Button
                          onClick={() => handleApproveValidator(validator)}
                          disabled={loading}
                          size="sm"
                          variant="default"
                        >
                          Approve
                        </Button>
                      )}
                      {!isAdmin && <Badge variant="warning">Pending</Badge>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Validator Proposals */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Validator Proposals ({pendingValidatorProposals.length} pending)
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {pendingValidatorProposals.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-500">No pending validator proposals</p>
                  </div>
                ) : (
                  pendingValidatorProposals.map((proposal) => {
                    const threshold = Math.floor(currentAdmins.length / 2) + 1
                    const hasSignedProposal = proposal.signatures.includes(getActiveAccounts()[selectedAccount]?.address as Address)
                    const createdDate = new Date(Number(proposal.createdAt) * 1000)

                    return (
                      <div key={proposal.id} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-600">Proposal #{proposal.id}</span>
                              <Badge variant={proposal.isApproval ? 'default' : 'destructive'}>
                                {proposal.isApproval ? 'Approve' : 'Remove'}
                              </Badge>
                            </div>
                            <div className="text-sm mb-2">
                              <AddressLink address={proposal.candidate} />
                            </div>
                            <div className="text-xs text-gray-600">
                              <div>Signatures: {proposal.signatureCount}/{threshold}</div>
                              {proposal.reason && (
                                <div className="mt-1">Reason: {proposal.reason}</div>
                              )}
                              <div className="mt-1 text-gray-500">
                                Created: {createdDate.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Completed Validator Proposals */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Completed Validator Proposals ({completedValidatorProposals.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {completedValidatorProposals.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-500">No completed validator proposals</p>
                  </div>
                ) : (
                  completedValidatorProposals.slice().reverse().map((proposal) => {
                    const createdDate = new Date(Number(proposal.createdAt) * 1000)

                    return (
                      <div key={proposal.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-600">Proposal #{proposal.id}</span>
                              <Badge variant="success">Executed</Badge>
                              <Badge variant={proposal.isApproval ? 'default' : 'destructive'}>
                                {proposal.isApproval ? 'Approve' : 'Remove'}
                              </Badge>
                            </div>
                            <div className="text-sm mb-2">
                              <AddressLink address={proposal.candidate} />
                            </div>
                            <div className="text-xs text-gray-600">
                              <div>Signatures: {proposal.signatureCount}</div>
                              {proposal.reason && (
                                <div className="mt-1">Reason: {proposal.reason}</div>
                              )}
                              <div className="mt-1 text-gray-500">
                                Created: {createdDate.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <>
                {/* Add Validator */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Propose Adding Validator</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newValidatorAddress}
                      onChange={(e) => setNewValidatorAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <Button
                      onClick={handleAddValidator}
                      disabled={loading || !newValidatorAddress}
                    >
                      {loading ? 'Proposing...' : 'Propose Addition'}
                    </Button>
                  </div>
                </div>

                {/* Remove Validator */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Propose Removing Validator</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={removeValidatorAddress}
                      onChange={(e) => setRemoveValidatorAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                    />
                    <Button
                      onClick={handleRemoveValidator}
                      disabled={loading || !removeValidatorAddress}
                      variant="destructive"
                    >
                      {loading ? 'Proposing...' : 'Propose Removal'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Non-Admin Message */}
        {!isAdmin && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              You need admin privileges to add or remove validators. Current account is not an admin.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
