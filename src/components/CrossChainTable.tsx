import type { CrossChainTransaction } from '@/types/bridge'
import { BRIDGE_CONFIG } from '@/types/bridge'
import { useNavigation } from '@/App'
import { ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface CrossChainTableProps {
  transactions: CrossChainTransaction[]
  loading: boolean
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatAmount(amount: bigint): string {
  // Assuming 6 decimals
  const value = Number(amount) / 1e6
  return value.toFixed(2)
}

function formatTimestamp(timestamp: bigint | null): string {
  if (!timestamp) return '-'
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function CrossChainTable({ transactions, loading }: CrossChainTableProps) {
  const { navigateToExplorer } = useNavigation()

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="animate-pulse text-gray-500">Loading cross-chain transactions...</div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-gray-500">
          No bridged orders found. Create an order on Besu to see it here.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Besu Block
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Block
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.compositeKey} className="hover:bg-gray-50">
                {/* Order */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      #{tx.orderId.toString()}
                    </span>
                    <button
                      onClick={() =>
                        navigateToExplorer({ address: tx.besuProxyAddress })
                      }
                      className="text-xs font-mono text-blue-600 hover:text-blue-800 text-left"
                      title={tx.besuProxyAddress}
                    >
                      Proxy: {truncateAddress(tx.besuProxyAddress)}
                    </button>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </span>
                  ) : tx.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                </td>

                {/* Timestamp */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {tx.besuEvent?.timestamp
                      ? formatTimestamp(tx.besuEvent.timestamp)
                      : '-'}
                  </span>
                </td>

                {/* Besu Block */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.besuEvent ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-mono text-gray-900">
                        {tx.besuEvent.blockNumber.toString()}
                      </span>
                      <button
                        onClick={() =>
                          navigateToExplorer({ txHash: tx.besuEvent!.txHash })
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 text-left"
                      >
                        View tx
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                {/* Base Block */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.baseEvent ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-mono text-gray-900">
                        {tx.baseEvent.blockNumber.toString()}
                      </span>
                      <a
                        href={`${BRIDGE_CONFIG.baseSepolia.explorerUrl}/tx/${tx.baseEvent.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        BaseScan
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-yellow-600">Awaiting...</span>
                  )}
                </td>

                {/* Payment */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.baseEvent ? (
                    <span className="text-sm font-medium text-gray-900">
                      {formatAmount(tx.baseEvent.amount)} units
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                {/* Recipient */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.besuEvent?.manufacturer ? (
                    <span
                      className="text-sm font-mono text-gray-900"
                      title={tx.besuEvent.manufacturer}
                    >
                      {truncateAddress(tx.besuEvent.manufacturer)}
                    </span>
                  ) : tx.baseEvent?.recipient ? (
                    <span
                      className="text-sm font-mono text-gray-900"
                      title={tx.baseEvent.recipient}
                    >
                      {truncateAddress(tx.baseEvent.recipient)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
