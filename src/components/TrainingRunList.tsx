import React from 'react'
import type { TrainingRun } from '@/types/ml'
import { Badge } from './ui/Badge'
import { formatAddress } from '@/lib/utils'
import { Database, TrendingUp } from 'lucide-react'

interface TrainingRunListProps {
  runs: TrainingRun[]
  onModelClick?: (modelId: bigint) => void
}

export function TrainingRunList({ runs, onModelClick }: TrainingRunListProps) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No training runs found
      </div>
    )
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatLoss = (loss: bigint) => {
    return (Number(loss) / 1e6).toFixed(6)
  }

  const formatAccuracy = (accuracy: bigint) => {
    return (Number(accuracy) / 1e4).toFixed(2) + '%'
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Run ID
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dataset
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hyperparams
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metrics
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trainer
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Output Model
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {runs.map((run) => (
            <tr key={run.id.toString()} className="hover:bg-gray-50">
              <td className="px-3 py-3 whitespace-nowrap">
                <Badge variant="secondary">#{run.id.toString()}</Badge>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-start gap-1 text-xs">
                  <Database className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-gray-900 truncate max-w-[200px]" title={run.datasetUri}>
                      {run.datasetUri}
                    </div>
                    <div className="text-gray-500 font-mono truncate" title={run.datasetHash}>
                      {formatAddress(run.datasetHash)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="font-mono text-xs text-gray-600" title={run.hyperparamsHash}>
                  {formatAddress(run.hyperparamsHash)}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500" />
                    <span className="text-gray-600">Epochs:</span>
                    <span className="font-semibold">{run.metrics.epochs.toString()}</span>
                  </div>
                  <div className="text-gray-600">
                    Loss: <span className="font-mono text-gray-900">{formatLoss(run.metrics.finalLoss)}</span>
                  </div>
                  <div className="text-gray-600">
                    Accuracy: <span className="font-mono text-green-600">{formatAccuracy(run.metrics.finalAccuracy)}</span>
                  </div>
                  {run.metrics.custom && (
                    <div className="text-gray-500 truncate max-w-[150px]" title={run.metrics.custom}>
                      Custom: {run.metrics.custom}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="font-mono text-xs text-gray-900" title={run.trainer}>
                  {formatAddress(run.trainer)}
                </div>
              </td>
              <td className="px-3 py-3">
                {onModelClick ? (
                  <button
                    onClick={() => onModelClick(run.outputModelId)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline"
                  >
                    Model #{run.outputModelId.toString()}
                  </button>
                ) : (
                  <Badge variant="default">Model #{run.outputModelId.toString()}</Badge>
                )}
              </td>
              <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                {formatTimestamp(run.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
