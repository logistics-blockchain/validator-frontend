import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AddressLink } from '@/components/shared/AddressLink'
import type { Address } from 'viem'

interface ValidatorPanelProps {
  currentValidators: Address[]
  pendingApplications: Address[]
  isAdmin: boolean
  loading: boolean
  newValidatorAddress: string
  removeValidatorAddress: string
  onNewValidatorAddressChange: (value: string) => void
  onRemoveValidatorAddressChange: (value: string) => void
  onAddValidator: () => void
  onRemoveValidator: () => void
  onApproveValidator: (validator: Address) => void
}

export function ValidatorPanel({
  currentValidators,
  pendingApplications,
  isAdmin,
  loading,
  newValidatorAddress,
  removeValidatorAddress,
  onNewValidatorAddressChange,
  onRemoveValidatorAddressChange,
  onAddValidator,
  onRemoveValidator,
  onApproveValidator,
}: ValidatorPanelProps) {
  return (
    <div className="space-y-6">
      {/* Current Validators */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Current Validators ({currentValidators.length})
        </h3>
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

      {/* Pending Applications */}
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
                    onClick={() => onApproveValidator(validator)}
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
                onChange={(e) => onNewValidatorAddressChange(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <Button
                onClick={onAddValidator}
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
                onChange={(e) => onRemoveValidatorAddressChange(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
              />
              <Button
                onClick={onRemoveValidator}
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
  )
}
