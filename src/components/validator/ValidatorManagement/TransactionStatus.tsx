import { Badge } from '@/components/ui/Badge'
import { AddressLink } from '@/components/shared/AddressLink'
import type { TransactionStatusData } from './types'

interface TransactionStatusProps {
  txStatus: TransactionStatusData | null
}

export function TransactionStatus({ txStatus }: TransactionStatusProps) {
  if (!txStatus) return null

  return (
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
  )
}
