import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'
import { Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { NetworkHealth as NetworkHealthType } from '@/hooks/useNetworkHealth'
import type { ValidatorStats } from '@/hooks/useValidatorMetrics'

interface NetworkHealthProps {
  health: NetworkHealthType | null
  stats: ValidatorStats | null
  loading: boolean
}

export function NetworkHealth({ health, stats, loading }: NetworkHealthProps) {
  if (loading || !health || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading...
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const quorumNeeded = Math.ceil((health.totalValidators * 2) / 3)
  const hasQuorum = health.activeValidators >= quorumNeeded

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Network Health</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </span>
        </div>

        {/* Validators */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Validators</span>
          <span className="font-medium">
            {health.activeValidators}/{health.totalValidators}
          </span>
        </div>

        {/* Quorum */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Quorum (67%)</span>
          <span className={`font-medium ${hasQuorum ? 'text-green-600' : 'text-red-600'}`}>
            {hasQuorum ? 'Met' : 'Not Met'}
          </span>
        </div>

        {/* Uptime */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Uptime</span>
          <span className="font-medium">{health.uptime.toFixed(1)}%</span>
        </div>

        {/* Missed Blocks Warning */}
        {health.missedBlocks > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-700 pt-2 border-t">
            <AlertTriangle className="h-4 w-4" />
            <span>{health.missedBlocks} missed block{health.missedBlocks > 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
