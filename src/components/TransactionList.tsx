import { Badge } from './ui/Badge'
import { AddressDisplay } from './AddressDisplay'
import { formatAddress } from '@/lib/utils'
import { ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import type { TransactionWithMetadata } from '@/types/explorer'
import type { Hash } from 'viem'

interface TransactionListProps {
  transactions: TransactionWithMetadata[]
  loading?: boolean
  onViewTransaction?: (txHash: Hash) => void
  onViewAddress?: (address: string) => void
}

export function TransactionList({
  transactions,
  loading = false,
  onViewTransaction,
  onViewAddress,
}: TransactionListProps) {
  const formatValue = (value: bigint) => {
    const eth = Number(value) / 1e18
    return eth === 0 ? '0' : eth.toFixed(4).replace(/\.?0+$/, '')
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - Number(timestamp)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const getDirectionBadge = (direction: TransactionWithMetadata['direction']) => {
    switch (direction) {
      case 'in':
        return (
          <Badge variant="success" className="gap-1 text-xs">
            <ArrowLeft className="h-3 w-3" />
            IN
          </Badge>
        )
      case 'out':
        return (
          <Badge variant="warning" className="gap-1 text-xs">
            <ArrowRight className="h-3 w-3" />
            OUT
          </Badge>
        )
      case 'self':
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <RefreshCw className="h-3 w-3" />
            SELF
          </Badge>
        )
      case 'create':
        return (
          <Badge variant="default" className="gap-1 text-xs">
            CREATE
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading transactions...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No transactions found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Txn Hash
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Block
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Age
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Direction
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              To
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => (
            <tr
              key={tx.hash}
              className={`${onViewTransaction ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
              onClick={() => onViewTransaction?.(tx.hash)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                {formatAddress(tx.hash)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {tx.blockNumber.toString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {tx.timestamp ? formatTimeAgo(tx.timestamp) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getDirectionBadge(tx.direction)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <AddressDisplay
                  address={tx.from}
                  showCopy={false}
                  onClick={onViewAddress ? () => onViewAddress(tx.from) : undefined}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tx.to ? (
                  <AddressDisplay
                    address={tx.to}
                    showCopy={false}
                    onClick={onViewAddress ? () => onViewAddress(tx.to!) : undefined}
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Contract Creation</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatValue(tx.value)} ETH
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tx.status === 'success' ? (
                  <Badge variant="success" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <XCircle className="h-3 w-3" />
                    Failed
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
