import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ValidatorStats } from '@/hooks/useValidatorMetrics'
import type { NetworkHealth } from '@/hooks/useNetworkHealth'

interface ValidatorOverviewProps {
  stats: ValidatorStats | null
  health: NetworkHealth | null
  loading: boolean
}

export function ValidatorOverview({ stats, health, loading }: ValidatorOverviewProps) {
  if (loading || !stats || !health) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading validator metrics...
        </CardContent>
      </Card>
    )
  }

  const formatBlockTime = (seconds: number) => {
    return `${seconds.toFixed(2)}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'degraded':
        return 'warning'
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleTimeString()
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Network Overview</CardTitle>
          <Badge variant={getStatusColor(health.status)}>
            {health.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Validators */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Validators</div>
            <div className="text-2xl font-bold">{health.totalValidators}</div>
          </div>

          {/* Active Validators */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Active Validators</div>
            <div className="text-2xl font-bold text-green-600">
              {health.activeValidators}
            </div>
          </div>

          {/* Current Block */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Current Block</div>
            <div className="text-2xl font-bold">
              {stats.currentBlockNumber.toString()}
            </div>
          </div>

          {/* Seconds Per Block */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Seconds/Block</div>
            <div className="text-2xl font-bold">
              {formatBlockTime(stats.averageBlockTime)}
            </div>
          </div>

          {/* Consensus Health */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Consensus Status</div>
            <div className="text-sm font-medium">{health.consensusHealth}</div>
          </div>

          {/* Block Production Rate */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Blocks/Minute</div>
            <div className="text-2xl font-bold">
              {health.blockProductionRate.toFixed(1)}
            </div>
          </div>

          {/* Network Uptime */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Network Uptime</div>
            <div className="text-2xl font-bold text-blue-600">
              {health.uptime.toFixed(1)}%
            </div>
          </div>

          {/* Last Block Time */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Last Block</div>
            <div className="text-sm font-medium">
              {formatTimestamp(health.lastBlockTime)}
            </div>
          </div>
        </div>

        {/* Missed Blocks Warning */}
        {health.missedBlocks > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm text-yellow-800">
              ⚠️ <strong>{health.missedBlocks}</strong> missed block(s) detected in recent history
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
