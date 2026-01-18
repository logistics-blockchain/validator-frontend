import type { ChainStatus } from '@/types/bridge'
import { BRIDGE_CONFIG } from '@/types/bridge'
import { Circle, ExternalLink } from 'lucide-react'

interface ChainStatusCardProps {
  chain: 'besu' | 'baseSepolia'
  status: ChainStatus
}

export function ChainStatusCard({ chain, status }: ChainStatusCardProps) {
  const config = chain === 'besu' ? BRIDGE_CONFIG.besu : BRIDGE_CONFIG.baseSepolia
  const explorerUrl = chain === 'baseSepolia' ? BRIDGE_CONFIG.baseSepolia.explorerUrl : null

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Circle
            className={`h-3 w-3 ${
              status.connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
            }`}
          />
          <h3 className="font-semibold text-gray-900">{status.name}</h3>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Chain ID</span>
          <span className="font-mono text-gray-900">{config.chainId}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className={status.connected ? 'text-green-600' : 'text-red-600'}>
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {status.latestBlock !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Latest Block</span>
            <span className="font-mono text-gray-900">{status.latestBlock.toString()}</span>
          </div>
        )}

        {status.error && (
          <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs">{status.error}</div>
        )}
      </div>
    </div>
  )
}
