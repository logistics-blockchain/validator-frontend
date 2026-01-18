import { useState } from 'react'
import { ChevronRight, ChevronDown, ArrowRight, ExternalLink } from 'lucide-react'
import type { ModelWithOwner, TrainingRun } from '@/types/ml'

export interface ModelTreeNodeData {
  model: ModelWithOwner
  run?: TrainingRun // The training run that produced this model (undefined for base)
  children: ModelTreeNodeData[]
}

interface ModelTreeNodeProps {
  node: ModelTreeNodeData
  depth: number
  isLast: boolean
}

function formatAccuracy(scaled: bigint): string {
  const value = Number(scaled) / 10000
  return `${value.toFixed(2)}%`
}

function formatLoss(scaled: bigint): string {
  const value = Number(scaled) / 1000000
  return value.toFixed(6)
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateHash(hash: string, len: number = 12): string {
  if (hash.length <= len) return hash
  return `${hash.slice(0, len)}...`
}

function isClickableUri(uri: string): boolean {
  return uri.startsWith('ipfs://') || uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('s3://')
}

function getClickableUrl(uri: string): string | null {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `https://ipfs.io/ipfs/${cid}`
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }
  return null
}

export function ModelTreeNode({ node, depth, isLast }: ModelTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isDerived = !!node.run

  const datasetUrl = node.run?.datasetUri ? getClickableUrl(node.run.datasetUri) : null

  return (
    <div>
      {/* Node row */}
      <div
        className={`flex items-start gap-2 py-2 px-3 rounded-md transition-colors ${
          isDerived ? 'hover:bg-blue-50 ml-2' : 'hover:bg-white'
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        {/* Derived indicator or expand toggle */}
        {isDerived ? (
          <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-0.5 rounded hover:bg-gray-200 transition-colors select-none ${
              !hasChildren ? 'invisible' : ''
            }`}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        )}

        {/* Model info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDerived ? 'text-blue-900' : 'text-gray-900'}`}>
              {node.model.name}
            </span>
            <span className="text-sm text-gray-500">#{node.model.id.toString()}</span>
            {isDerived && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded select-none">
                derived
              </span>
            )}
          </div>

          {/* Training run metrics (for derived models) */}
          {node.run && (
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-700">
              <span>Epochs: {node.run.metrics.epochs.toString()}</span>
              <span>Loss: {formatLoss(node.run.metrics.finalLoss)}</span>
              <span className="text-green-700 font-medium">
                Acc: {formatAccuracy(node.run.metrics.finalAccuracy)}
              </span>
              <span className="text-gray-500">
                Trained: {formatDate(node.run.timestamp)}
              </span>
            </div>
          )}

          {/* Dataset and hash */}
          <div className="text-sm text-gray-600 mt-1 font-mono">
            {node.run && node.run.datasetUri && (
              <>
                <span>Dataset: </span>
                {datasetUrl ? (
                  <a
                    href={datasetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                    title={node.run.datasetUri}
                  >
                    {truncateHash(node.run.datasetUri, 30)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span title={node.run.datasetUri}>{truncateHash(node.run.datasetUri, 30)}</span>
                )}
                <span> | </span>
              </>
            )}
            <span title={node.model.modelHash}>Hash: {truncateHash(node.model.modelHash, 16)}</span>
          </div>
        </div>

        {/* Child count */}
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 select-none"
          >
            {node.children.length} derived
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Children (recursive) */}
      {expanded && hasChildren && (
        <div className="border-l-2 border-blue-200 ml-5">
          {node.children.map((child, index) => (
            <ModelTreeNode
              key={child.model.id.toString()}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Utility function to build tree from flat arrays
export function buildModelTree(
  models: ModelWithOwner[],
  runs: TrainingRun[]
): ModelTreeNodeData[] {
  // Create a map for quick lookup
  const modelMap = new Map<string, ModelWithOwner>()
  models.forEach((m) => modelMap.set(m.id.toString(), m))

  // Create a map of outputModelId -> TrainingRun
  const runByOutputModel = new Map<string, TrainingRun>()
  runs.forEach((r) => runByOutputModel.set(r.outputModelId.toString(), r))

  // Create a map of parentModelId -> children
  const childrenMap = new Map<string, ModelWithOwner[]>()
  models.forEach((m) => {
    const parentKey = m.parentModelId.toString()
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, [])
    }
    childrenMap.get(parentKey)!.push(m)
  })

  // Recursive function to build tree node
  function buildNode(model: ModelWithOwner): ModelTreeNodeData {
    const children = childrenMap.get(model.id.toString()) || []
    const run = runByOutputModel.get(model.id.toString())

    return {
      model,
      run,
      children: children
        .sort((a, b) => Number(a.id - b.id))
        .map((child) => buildNode(child)),
    }
  }

  // Get base models (parentModelId = 0) and build trees
  const baseModels = models.filter((m) => m.parentModelId === 0n)
  return baseModels.sort((a, b) => Number(a.id - b.id)).map((m) => buildNode(m))
}
