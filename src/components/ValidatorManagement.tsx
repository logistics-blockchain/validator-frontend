import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { publicClient, createWalletClientForAccount } from '@/lib/viem'
import { parseAbi, type Address, type Abi } from 'viem'

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

export function ValidatorManagement() {
  const [newValidatorAddress, setNewValidatorAddress] = useState('')
  const [removeValidatorAddress, setRemoveValidatorAddress] = useState('')
  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [currentValidators, setCurrentValidators] = useState<Address[]>([])
  const [currentAdmins, setCurrentAdmins] = useState<Address[]>([])
  const [pendingApplications, setPendingApplications] = useState<Address[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCount, setAdminCount] = useState<number | null>(null) // null = not loaded yet
  const [validatorCount, setValidatorCount] = useState<number | null>(null) // null = not loaded yet
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(0)
  const [contractAbi, setContractAbi] = useState<Abi | null>(null)
  const [abiLoadError, setAbiLoadError] = useState<string | null>(null)
  const [pendingAdminProposals, setPendingAdminProposals] = useState<AdminProposal[]>([])

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
      console.log('Loaded validators:', validators.length)

      // Get pending applications (optional - might not exist on all contract versions)
      try {
        const pending = await publicClient.readContract({
          address: VALIDATOR_CONTRACT,
          abi: contractAbi,
          functionName: 'getPendingValidators',
        }) as Address[]
        setPendingApplications(pending)
        console.log('Loaded pending applications:', pending.length)
      } catch (pendingError) {
        console.log('getPendingValidators() not available on this contract')
        setPendingApplications([]) // No pending applications feature
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
        console.log('Loaded admins:', admins.length)
      } catch (adminError) {
        console.error('Error loading admins:', adminError)
        setCurrentAdmins([])
        setAdminCount(1) // Fallback for genesis-deployed contracts
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

      // Load pending admin proposals
      await loadAdminProposals()
    } catch (error) {
      console.error('Error loading contract state:', error)
    }
  }

  const loadAdminProposals = async () => {
    if (!contractAbi) {
      console.log('Cannot load admin proposals: ABI not loaded')
      return
    }

    console.log('Loading admin proposals...')
    try {
      const proposals: AdminProposal[] = []

      // Try to load proposals 0-9 (since adminProposalCount reverts)
      for (let i = 0; i < 10; i++) {
        try {
          const proposal = await publicClient.readContract({
            address: VALIDATOR_CONTRACT,
            abi: contractAbi,
            functionName: 'adminProposals',
            args: [BigInt(i)],
          }) as [Address, boolean, boolean, bigint]

          const [candidate, isAddition, executed, createdAt] = proposal

          console.log(`Proposal #${i}: candidate=${candidate}, isAddition=${isAddition}, executed=${executed}`)

          // Only include non-executed proposals
          if (!executed && candidate !== '0x0000000000000000000000000000000000000000') {
            // Get signatures for this proposal
            const signatures = await publicClient.readContract({
              address: VALIDATOR_CONTRACT,
              abi: contractAbi,
              functionName: 'getAdminProposalSignatures',
              args: [BigInt(i)],
            }) as Address[]

            console.log(`  -> Proposal #${i} is pending with ${signatures.length} signatures:`, signatures)

            proposals.push({
              id: i,
              candidate,
              isAddition,
              executed,
              createdAt,
              signatures,
              signatureCount: signatures.length,
            })
          }
        } catch (err) {
          // Proposal doesn't exist or other error, skip it
          if (i < 3) {
            console.log(`Proposal #${i} does not exist or error:`, err)
          }
          continue
        }
      }

      setPendingAdminProposals(proposals)
      console.log(`✓ Loaded ${proposals.length} pending admin proposals`, proposals)
    } catch (error) {
      console.error('ERROR loading admin proposals:', error)
      setPendingAdminProposals([])
    }
  }

  const handleAddValidator = async () => {
    if (!contractAbi) return
    if (!newValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(newValidatorAddress)) {
      alert('Please enter a valid Ethereum address')
      return
    }

    setLoading(true)
    try {
      const walletClient = createWalletClientForAccount(selectedAccount)

      // Use proposeApproval instead of addValidator
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeApproval',
        args: [newValidatorAddress as Address, ''],  // address, reason (empty string)
      })

      console.log('Transaction hash:', hash)

      // Wait for transaction
      await publicClient.waitForTransactionReceipt({ hash })

      alert('Validator approval proposed successfully! (Single admin = instant approval)')
      setNewValidatorAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error proposing validator approval:', error)
      alert(`Error: ${error.message || 'Failed to propose validator approval'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveValidator = async () => {
    if (!contractAbi) return
    if (!removeValidatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(removeValidatorAddress)) {
      alert('Please enter a valid Ethereum address')
      return
    }

    if (!confirm(`Are you sure you want to propose removing validator ${removeValidatorAddress}?`)) {
      return
    }

    setLoading(true)
    try {
      const walletClient = createWalletClientForAccount(selectedAccount)

      // Use proposeRemoval instead of removeValidator
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeRemoval',
        args: [removeValidatorAddress as Address, ''],  // address, reason (empty string)
      })

      console.log('Transaction hash:', hash)

      await publicClient.waitForTransactionReceipt({ hash })

      alert('Validator removal proposed successfully! (Single admin = instant removal)')
      setRemoveValidatorAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error proposing validator removal:', error)
      alert(`Error: ${error.message || 'Failed to propose validator removal'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveValidator = async (validator: Address) => {
    if (!contractAbi) return
    setLoading(true)
    try {
      const walletClient = createWalletClientForAccount(selectedAccount)

      // Use proposeApproval for pending applications
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeApproval',
        args: [validator, ''],  // address, reason (empty string)
      })

      console.log('Transaction hash:', hash)

      await publicClient.waitForTransactionReceipt({ hash })

      alert('Validator approved successfully!')
      loadContractState()
    } catch (error: any) {
      console.error('Error approving validator:', error)
      alert(`Error: ${error.message || 'Failed to approve validator'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!contractAbi) return
    if (!newAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      alert('Please enter a valid Ethereum address')
      return
    }

    setLoading(true)
    try {
      const walletClient = createWalletClientForAccount(selectedAccount)

      // Check current admin count to provide appropriate feedback
      const currentAdminCount = currentAdmins.length
      const threshold = Math.floor(currentAdminCount / 2) + 1

      // Use proposeAddAdmin to add a new admin
      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'proposeAddAdmin',
        args: [newAdminAddress as Address],  // only address parameter
      })

      console.log('Transaction hash:', hash)

      // Wait for transaction
      await publicClient.waitForTransactionReceipt({ hash })

      // Context-aware success message
      if (currentAdminCount === 1) {
        alert('Admin added successfully! (Single admin = instant approval)')
      } else {
        alert(`Admin proposal created! Requires ${threshold - 1} more signature(s) to execute (${threshold}/${currentAdminCount} needed)`)
      }

      setNewAdminAddress('')
      loadContractState()
    } catch (error: any) {
      console.error('Error adding admin:', error)
      alert(`Error: ${error.message || 'Failed to add admin'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignProposal = async (proposalId: number, candidateAddress: Address) => {
    if (!contractAbi) return

    if (!confirm(`Sign proposal to add admin ${candidateAddress}?`)) {
      return
    }

    setLoading(true)
    try {
      const walletClient = createWalletClientForAccount(selectedAccount)

      const hash = await walletClient.writeContract({
        address: VALIDATOR_CONTRACT,
        abi: contractAbi,
        functionName: 'signAdminProposal',
        args: [BigInt(proposalId)],
      })

      console.log('Transaction hash:', hash)

      await publicClient.waitForTransactionReceipt({ hash })

      alert('Proposal signed successfully! If threshold reached, admin has been added.')
      loadContractState()
    } catch (error: any) {
      console.error('Error signing proposal:', error)
      alert(`Error: ${error.message || 'Failed to sign proposal'}`)
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
      <CardContent className="p-6 space-y-6">
        {/* ABI Load Error */}
        {abiLoadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-semibold">Failed to Initialize Contract Interface</p>
            <p className="text-xs text-red-600 mt-1">{abiLoadError}</p>
            <p className="text-xs text-red-600 mt-1">Validator management functions will not be available.</p>
          </div>
        )}

        {/* Account Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Acting As Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Account #0 (Cloud Validator Node 0)</option>
            <option value={1}>Account #1 (Cloud Validator Node 1)</option>
          </select>
        </div>

        {/* Current Admins */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Admins ({currentAdmins.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {currentAdmins.map((admin, index) => (
              <div key={admin} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="font-mono text-sm">{admin}</div>
                  <div className="text-xs text-gray-500">Admin #{index + 1}</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Admin (only shown to admins) */}
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
            <p className="text-xs text-gray-500 mt-1">
              Adding a second admin will enable multi-signature approvals. Currently: instant approval.
            </p>
          </div>
        )}

        {/* Pending Admin Proposals */}
        {pendingAdminProposals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Pending Admin Proposals ({pendingAdminProposals.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {pendingAdminProposals.map((proposal) => {
                const threshold = Math.floor(currentAdmins.length / 2) + 1
                const walletClient = createWalletClientForAccount(selectedAccount)
                const hasSignedProposal = proposal.signatures.some(
                  sig => sig.toLowerCase() === walletClient.account.address.toLowerCase()
                )

                return (
                  <div key={proposal.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-600">Proposal #{proposal.id}</span>
                          <Badge variant="warning">Pending</Badge>
                        </div>
                        <div className="font-mono text-sm mb-2">{proposal.candidate}</div>
                        <div className="text-xs text-gray-600">
                          <div>Signatures: {proposal.signatureCount}/{threshold} required</div>
                          <div className="mt-1">
                            Signed by: {proposal.signatures.length > 0
                              ? proposal.signatures.map(s => s.slice(0, 8) + '...').join(', ')
                              : 'None'}
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
              })}
            </div>
          </div>
        )}

        {/* Current Validators */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Validators ({currentValidators.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {currentValidators.map((validator, index) => (
              <div key={validator} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="font-mono text-sm">{validator}</div>
                  <div className="text-xs text-gray-500">Validator #{index + 1}</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Pending Applications ({pendingApplications.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingApplications.map((validator) => (
                <div key={validator} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                  <div className="font-mono text-sm">{validator}</div>
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
              ))}
            </div>
          </div>
        )}

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

        {/* Non-Admin Message */}
        {!isAdmin && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              ℹ️ You need admin privileges to add or remove validators. Current account is not an admin.
            </p>
          </div>
        )}

        {/* Contract Info */}
        <div className="pt-4 border-t">
          <div className="text-xs text-gray-500">
            <div>Contract: <span className="font-mono">{VALIDATOR_CONTRACT}</span></div>
            <div className="mt-1">
              Quorum: {adminCount > 1 ? `${Math.floor(adminCount / 2) + 1}/${adminCount} admin approvals required` : 'Single admin (instant approval)'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
