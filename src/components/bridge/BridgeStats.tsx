import type { BridgeStats as BridgeStatsType } from '@/types/bridge'
import { ArrowRightLeft, CheckCircle, Clock, Activity } from 'lucide-react'

interface BridgeStatsProps {
  stats: BridgeStatsType
}

export function BridgeStats({ stats }: BridgeStatsProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Bridge Statistics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
            <div className="text-sm text-gray-500">Total Orders</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.completedBridges}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingBridges}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {stats.lastActivity
                ? stats.lastActivity.toLocaleString()
                : 'No activity'}
            </div>
            <div className="text-sm text-gray-500">Last Activity</div>
          </div>
        </div>
      </div>
    </div>
  )
}
