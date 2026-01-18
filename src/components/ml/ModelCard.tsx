import React, { useState } from 'react'
import type { ModelWithOwner, TrainingRun } from '@/types/ml'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TrainingRunList } from '@/components/ml/TrainingRunList'
import { formatAddress } from '@/lib/utils'
import { Brain, GitBranch, ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface ModelCardProps {
  model: ModelWithOwner
  runs: TrainingRun[]
  onViewLineage?: (modelId: bigint) => void
  onModelClick?: (modelId: bigint) => void
}

export function ModelCard({ model, runs, onViewLineage, onModelClick }: ModelCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const isBaseModel = model.parentModelId === 0n
  const runsForThisModel = runs.filter((run) => run.inputModelId === model.id)

  return (
    <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Brain className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <span className="truncate">{model.name}</span>
                <Badge variant="secondary">ID: {model.id.toString()}</Badge>
                {isBaseModel && <Badge variant="success">Base Model</Badge>}
              </CardTitle>
              <div className="mt-1 space-y-1">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Owner:</span>{' '}
                  <span className="font-mono">{formatAddress(model.owner)}</span>
                </div>
                {!isBaseModel && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <GitBranch className="h-3 w-3" />
                    <span className="font-medium">Parent:</span>
                    {onModelClick ? (
                      <button
                        onClick={() => onModelClick(model.parentModelId)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                      >
                        Model #{model.parentModelId.toString()}
                      </button>
                    ) : (
                      <span>Model #{model.parentModelId.toString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {onViewLineage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLineage(model.id)}
              className="flex-shrink-0 ml-2"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              View Lineage
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Model Hash</div>
            <div className="font-mono text-xs bg-gray-50 p-2 rounded border break-all">
              {model.modelHash}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Metadata</div>
            <div className="text-xs bg-gray-50 p-2 rounded border break-all max-h-[60px] overflow-y-auto">
              {model.metadata || 'No metadata'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="h-3 w-3" />
          <span className="font-medium">Created:</span>
          <span>{formatTimestamp(model.createdAt)}</span>
        </div>

        {runsForThisModel.length > 0 && (
          <div className="pt-3 border-t">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-purple-600" />
                Training Runs ({runsForThisModel.length})
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-3">
                <TrainingRunList runs={runsForThisModel} onModelClick={onModelClick} />
              </div>
            )}
          </div>
        )}

        {runsForThisModel.length === 0 && (
          <div className="pt-3 border-t text-center text-xs text-gray-500">
            No training runs using this model as input
          </div>
        )}
      </CardContent>
    </Card>
  )
}
