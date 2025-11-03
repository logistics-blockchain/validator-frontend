import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Badge } from './ui/Badge'
import { formatAddress } from '@/lib/utils'
import { Shield, CheckCircle2 } from 'lucide-react'
import type { ValidatorStats } from '@/hooks/useValidatorMetrics'
import type { Address } from 'viem'

interface ConsensusMonitorProps {
  stats: ValidatorStats | null
  loading: boolean
  onViewBlock?: (blockNumber: bigint) => void
}

export function ConsensusMonitor({ stats, loading, onViewBlock }: ConsensusMonitorProps) {
  if (loading || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Consensus</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Current Block */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Current Block</span>
          <span className="font-medium">#{stats.currentBlockNumber.toString()}</span>
        </div>

        {/* Block Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Block Time</span>
          <span className="font-medium">{stats.averageBlockTime.toFixed(2)}s</span>
        </div>

        {/* Block Time Variance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Variance</span>
          <span className="font-medium">±{stats.blockTimeVariance.toFixed(3)}s</span>
        </div>

        {/* Total Blocks */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Blocks Analyzed</span>
          <span className="font-medium">100</span>
        </div>
      </CardContent>
    </Card>
  )
}
