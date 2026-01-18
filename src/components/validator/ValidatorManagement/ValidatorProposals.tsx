import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AddressLink } from '@/components/shared/AddressLink'
import type { Address } from 'viem'
import type { ValidatorProposal } from './types'

interface ValidatorProposalsProps {
  pendingProposals: ValidatorProposal[]
  completedProposals: ValidatorProposal[]
  currentAdmins: Address[]
  currentAccountAddress: Address
  isAdmin: boolean
  loading: boolean
  onSignProposal: (proposalId: number, candidate: Address) => void
}

export function ValidatorProposals({
  pendingProposals,
  completedProposals,
  currentAdmins,
  currentAccountAddress,
  isAdmin,
  loading,
  onSignProposal,
}: ValidatorProposalsProps) {
  const threshold = Math.floor(currentAdmins.length / 2) + 1

  return (
    <div className="space-y-6">
      {/* Pending Validator Proposals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Validator Proposals ({pendingProposals.length} pending)
        </h3>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {pendingProposals.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
              <p className="text-sm text-gray-500">No pending validator proposals</p>
            </div>
          ) : (
            pendingProposals.map((proposal) => {
              const hasSignedProposal = proposal.signatures.some(
                sig => sig.toLowerCase() === currentAccountAddress.toLowerCase()
              )
              const createdDate = new Date(Number(proposal.createdAt) * 1000)

              return (
                <div key={proposal.id} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600">
                          Proposal #{proposal.id}
                        </span>
                        <Badge variant="warning">Pending</Badge>
                        <Badge variant={proposal.isApproval ? 'default' : 'destructive'}>
                          {proposal.isApproval ? 'Approve' : 'Remove'}
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
                        {proposal.reason && (
                          <div className="mt-1">Reason: {proposal.reason}</div>
                        )}
                        <div className="mt-1 text-gray-500">
                          Created: {createdDate.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {isAdmin && !hasSignedProposal && (
                      <Button
                        onClick={() => onSignProposal(proposal.id, proposal.candidate)}
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

      {/* Completed Validator Proposals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Completed Validator Proposals ({completedProposals.length})
        </h3>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {completedProposals.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
              <p className="text-sm text-gray-500">No completed validator proposals</p>
            </div>
          ) : (
            completedProposals.slice().reverse().map((proposal) => {
              const createdDate = new Date(Number(proposal.createdAt) * 1000)

              return (
                <div key={proposal.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600">
                          Proposal #{proposal.id}
                        </span>
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
    </div>
  )
}
