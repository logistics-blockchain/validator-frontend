import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { formatAddress } from '@/lib/utils'
import { Activity } from 'lucide-react'
import type { ValidatorMetrics } from '@/hooks/useValidatorMetrics'
import type { Address } from 'viem'

interface ValidatorListProps {
  validators: ValidatorMetrics[]
  loading: boolean
  onViewAddress?: (address: Address) => void
}

export function ValidatorList({ validators, loading, onViewAddress }: ValidatorListProps) {
  const formatTimeAgo = (timestamp: bigint) => {
    if (timestamp === 0n) return '-'

    const now = Math.floor(Date.now() / 1000)
    const diff = now - Number(timestamp)

    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  const getUptimeColor = (uptime: number) => {
    if (uptime === 0) return 'text-gray-400'
    if (uptime >= 95) return 'text-green-600'
    if (uptime >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
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
        <CardTitle className="text-base">Validators</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Address
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Blocks
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Last
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Uptime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validators.map((validator) => (
                <tr key={validator.address} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="font-mono text-xs">
                      {formatAddress(validator.address)}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {validator.isActive ? (
                      <Activity className="h-3 w-3 text-green-500" />
                    ) : (
                      <div className="h-3 w-3 rounded-full bg-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium">{validator.blocksProduced}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {formatTimeAgo(validator.lastBlockTime)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getUptimeColor(validator.uptime)}`}>
                      {validator.uptime.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {validators.length === 0 && (
          <div className="text-center py-8 text-gray-500">No validators</div>
        )}
      </CardContent>
    </Card>
  )
}
