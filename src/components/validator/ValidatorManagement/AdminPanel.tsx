import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AddressLink } from '@/components/shared/AddressLink'
import type { Address } from 'viem'

interface AdminPanelProps {
  currentAdmins: Address[]
  isAdmin: boolean
  newAdminAddress: string
  onNewAdminAddressChange: (value: string) => void
  onAddAdmin: () => void
  loading: boolean
}

export function AdminPanel({
  currentAdmins,
  isAdmin,
  newAdminAddress,
  onNewAdminAddressChange,
  onAddAdmin,
  loading,
}: AdminPanelProps) {
  return (
    <div className="space-y-6">
      {/* Current Admins */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Current Admins ({currentAdmins.length})
        </h3>
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

      {/* Add New Admin */}
      {isAdmin && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Admin</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAdminAddress}
              onChange={(e) => onNewAdminAddressChange(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <Button
              onClick={onAddAdmin}
              disabled={loading || !newAdminAddress}
            >
              {loading ? 'Adding...' : 'Add Admin'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
