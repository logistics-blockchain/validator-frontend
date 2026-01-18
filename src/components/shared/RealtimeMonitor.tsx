import { useBlockchainStore } from '@/store/blockchainStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatAddress } from '@/lib/utils'

export function RealtimeMonitor() {
  const { currentBlock, recentBlocks } = useBlockchainStore()

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle>Real-time Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Block */}
        <div>
          <div className="text-sm text-gray-600 mb-2">Current Block</div>
          {currentBlock ? (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500">Block Number</div>
                <div className="font-mono font-bold">{currentBlock.number?.toString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Timestamp</div>
                <div className="font-mono text-sm">
                  {new Date(Number(currentBlock.timestamp) * 1000).toLocaleTimeString()}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500">Hash</div>
                <code className="text-xs break-all">{currentBlock.hash}</code>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Waiting for blocks...</div>
          )}
        </div>

        {/* Recent Blocks */}
        <div>
          <div className="text-sm text-gray-600 mb-2">Recent Blocks</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentBlocks.length > 0 ? (
              recentBlocks.map((block) => (
                <div
                  key={block.hash}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <Badge variant="secondary">{block.number?.toString()}</Badge>
                  </div>
                  <div className="text-xs font-mono">{formatAddress(block.hash || '0x')}</div>
                  <div className="text-xs text-gray-500">
                    {block.transactions.length} txs
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No recent blocks</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
