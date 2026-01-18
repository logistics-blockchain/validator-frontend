import { useBridgeEvents } from '@/hooks/useBridgeEvents'
import { useBridgeExport } from '@/hooks/useBridgeExport'
import { ChainStatusCard } from './ChainStatusCard'
import { BridgeStats } from './BridgeStats'
import { CrossChainTable } from './CrossChainTable'
import { Button } from './ui/Button'
import { RefreshCw, Download } from 'lucide-react'

export function BridgeView() {
  const {
    matchedTransactions,
    loading,
    errors,
    chainStatus,
    stats,
    refresh,
  } = useBridgeEvents()
  const { exportBridgeTransactions } = useBridgeExport()

  const isRefreshing = loading.besu || loading.base

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cross-Chain Bridge</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track order creation on Besu and payment records on Base Sepolia
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportBridgeTransactions(matchedTransactions)}
            disabled={matchedTransactions.length === 0}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={refresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Chain Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChainStatusCard chain="besu" status={chainStatus.besu} />
        <ChainStatusCard chain="baseSepolia" status={chainStatus.base} />
      </div>

      {/* Stats */}
      <BridgeStats stats={stats} />

      {/* Errors */}
      {(errors.besu || errors.base) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Connection Errors</h3>
          {errors.besu && (
            <p className="text-sm text-red-600">Besu: {errors.besu}</p>
          )}
          {errors.base && (
            <p className="text-sm text-red-600">Base Sepolia: {errors.base}</p>
          )}
        </div>
      )}

      {/* Transaction Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Cross-Chain Transactions
        </h3>
        <CrossChainTable
          transactions={matchedTransactions}
          loading={isRefreshing}
        />
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong> When an order is created on Besu (OrderCreated event),
        the relay service records a payment intent on Base Sepolia (PaymentRecorded event).
        Transactions are matched by the composite key (proxy address + order ID).
      </div>
    </div>
  )
}
