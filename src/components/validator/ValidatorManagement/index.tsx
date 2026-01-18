import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AddressLink } from '@/components/shared/AddressLink'
import { publicClient, createWalletClientForAccount, getActiveAccounts } from '@/lib/viem'
import { formatAddress } from '@/lib/utils'
import type { Address, Abi } from 'viem'

import { TransactionStatus } from './TransactionStatus'
import { AdminPanel } from './AdminPanel'
import { AdminProposals } from './AdminProposals'
import { ValidatorPanel } from './ValidatorPanel'
import { ValidatorProposals } from './ValidatorProposals'
import { VALIDATOR_CONTRACT } from './types'
import type { AdminProposal, ValidatorProposal, TransactionStatusData } from './types'

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
  const [txStatus, setTxStatus] = useState<TransactionStatusData | null>(null)

  // Load contract ABI
  useEffect(() => {
    fetch('/artifacts/DynamicMultiSigValidatorManager.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then(data => {
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
    const interval = setInterval(loadContractState, 30000)
    return () => clearInterval(interval)
  }, [selectedAccount, contractAbi])

  const loadContractState = async () => {
    if (!contractAbi) return
    try {
      const validators = await publicClient.readContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'getValidators',
      }) as Address[]
      setCurrentValidators(validators)
      setValidatorCount(validators.length)

      try {
        const pending = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi: contractAbi,
          functionName: 'getPendingValidators',
        }) as Address[]
        setPendingApplications(pending)
      } catch {
        setPendingApplications([])
      }

      try {
        const admins = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi: contractAbi,
          functionName: 'getAdmins',
        }) as Address[]
        setCurrentAdmins(admins)
        setAdminCount(admins.length)
      } catch {
        setCurrentAdmins([])
        setAdminCount(1)
      }

      const walletClient = createWalletClientForAccount(selectedAccount)
      const adminStatus = await publicClient.readContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'isAdmin',
        args: [walletClient.account.address],
      }) as boolean
      setIsAdmin(adminStatus)

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

      for (let i = 0; i < 5; i++) {
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
        } catch {
          continue
        }
      }

      setPendingAdminProposals(pending)
      setCompletedAdminProposals(completed)
    } catch {
      setPendingAdminProposals([])
      setCompletedAdminProposals([])
    }
  }

  const loadValidatorProposals = async () => {
    if (!contractAbi) return
    try {
      const pending: ValidatorProposal[] = []
      const completed: ValidatorProposal[] = []

      for (let i = 0; i < 5; i++) {
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
        } catch {
          continue
        }
      }

      setPendingValidatorProposals(pending)
      setCompletedValidatorProposals(completed)
    } catch {
      setPendingValidatorProposals([])
      setCompletedValidatorProposals([])
    }
  }

  const handleAddValidator = async () => {
    if (!contractAbi) return
    if (!newValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(newValidatorAddress)) {
      setTxStatus({ type: 'add_validator', status: 'error', error: 'Please enter a valid Ethereum address', target: newValidatorAddress as Address })
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
      setTxStatus({ type: 'add_validator', status: 'error', error: error.message || 'Failed to propose validator approval', target: newValidatorAddress as Address })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveValidator = async () => {
    if (!contractAbi) return
    if (!removeValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(removeValidatorAddress)) {
      setTxStatus({ type: 'remove_validator', status: 'error', error: 'Please enter a valid Ethereum address', target: removeValidatorAddress as Address })
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
      setTxStatus({ type: 'remove_validator', status: 'error', error: error.message || 'Failed to propose validator removal', target: removeValidatorAddress as Address })
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
      setTxStatus({ type: 'approve_validator', status: 'error', error: error.message || 'Failed to approve validator', target: validator })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!contractAbi) return
    if (!newAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      setTxStatus({ type: 'add_admin', status: 'error', error: 'Please enter a valid Ethereum address', target: newAdminAddress as Address })
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
      setTxStatus({ type: 'add_admin', status: 'error', error: error.message || 'Failed to add admin', target: newAdminAddress as Address })
    } finally {
      setLoading(false)
    }
  }

  const handleSignAdminProposal = async (proposalId: number, candidateAddress: Address) => {
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
      setTxStatus({ type: 'sign_proposal', status: 'error', error: error.message || 'Failed to sign proposal', target: candidateAddress })
    } finally {
      setLoading(false)
    }
  }

  const handleSignValidatorProposal = async (proposalId: number, candidateAddress: Address) => {
    if (!contractAbi) return

    setLoading(true)
    setTxStatus({ type: 'sign_proposal', status: 'pending', target: candidateAddress })

    try {
      const walletClient = createWalletClientForAccount(selectedAccount)
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'signValidatorProposal',
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
      setTxStatus({ type: 'sign_proposal', status: 'error', error: error.message || 'Failed to sign validator proposal', target: candidateAddress })
    } finally {
      setLoading(false)
    }
  }

  const currentAccountAddress = createWalletClientForAccount(selectedAccount).account.address

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
              {adminCount === null ? 'Loading...' : `${adminCount} Admin${adminCount !== 1 ? 's' : ''}`} {validatorCount === null ? 'Loading...' : `${validatorCount} Validator${validatorCount !== 1 ? 's' : ''}`}
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

        {/* Contract Info */}
        <div className="grid grid-cols-[150px_1fr] gap-y-3 text-sm mb-6">
          <div className="text-gray-500">Contract:</div>
          <div className="text-xs">
            <AddressLink address={VALIDATOR_CONTRACT} showFull />
          </div>

          <div className="text-gray-500">Quorum:</div>
          <div className="font-medium">
            {adminCount && adminCount > 1
              ? `${Math.floor(adminCount / 2) + 1}/${adminCount} admin signatures required`
              : 'Single admin (instant approval)'}
          </div>
        </div>

        {/* Transaction Status */}
        <TransactionStatus txStatus={txStatus} />

        {/* Account Selector */}
        <div className="mb-6 mt-4">
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

        {/* Admin Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-blue-200">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminPanel
              currentAdmins={currentAdmins}
              isAdmin={isAdmin}
              newAdminAddress={newAdminAddress}
              onNewAdminAddressChange={setNewAdminAddress}
              onAddAdmin={handleAddAdmin}
              loading={loading}
            />
            <AdminProposals
              pendingProposals={pendingAdminProposals}
              completedProposals={completedAdminProposals}
              currentAdmins={currentAdmins}
              currentAccountAddress={currentAccountAddress}
              isAdmin={isAdmin}
              loading={loading}
              onSignProposal={handleSignAdminProposal}
            />
          </div>
        </div>

        {/* Validator Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-green-200">
            <div className="h-8 w-1 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Validator Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ValidatorPanel
              currentValidators={currentValidators}
              pendingApplications={pendingApplications}
              isAdmin={isAdmin}
              loading={loading}
              newValidatorAddress={newValidatorAddress}
              removeValidatorAddress={removeValidatorAddress}
              onNewValidatorAddressChange={setNewValidatorAddress}
              onRemoveValidatorAddressChange={setRemoveValidatorAddress}
              onAddValidator={handleAddValidator}
              onRemoveValidator={handleRemoveValidator}
              onApproveValidator={handleApproveValidator}
            />
            <ValidatorProposals
              pendingProposals={pendingValidatorProposals}
              completedProposals={completedValidatorProposals}
              currentAdmins={currentAdmins}
              currentAccountAddress={currentAccountAddress}
              isAdmin={isAdmin}
              loading={loading}
              onSignProposal={handleSignValidatorProposal}
            />
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
