import React, { useState } from 'react'
import { ValidatorList } from './ValidatorList'
import { NetworkHealth } from './NetworkHealth'
import { ConsensusMonitor } from './ConsensusMonitor'
import { ValidatorManagement } from './ValidatorManagement'
import { useValidatorMetrics } from '@/hooks/useValidatorMetrics'
import { useNetworkHealth } from '@/hooks/useNetworkHealth'
import type { Address } from 'viem'

interface ValidatorViewProps {
  onViewAddress?: (address: Address) => void
  onViewBlock?: (blockNumber: bigint) => void
}

export function ValidatorView({ onViewAddress, onViewBlock }: ValidatorViewProps) {
  const [blockCount] = useState(1000) // Monitor last 1000 blocks
  const { stats, loading: metricsLoading } = useValidatorMetrics(blockCount)
  const { health, loading: healthLoading } = useNetworkHealth()

  const loading = metricsLoading || healthLoading

  return (
    <div className="space-y-6">
      {/* Top Row: All Three Monitoring Cards Side by Side */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <NetworkHealth health={health} stats={stats} loading={loading} />
        </div>
        <div>
          <ConsensusMonitor stats={stats} loading={loading} onViewBlock={onViewBlock} />
        </div>
        <div>
          <ValidatorList
            validators={stats?.validators || []}
            loading={loading}
            onViewAddress={onViewAddress}
          />
        </div>
      </div>

      {/* Bottom Row: Validator Management */}
      <div>
        <ValidatorManagement />
      </div>
    </div>
  )
}
