import React, { useState, useMemo } from 'react'
import { useMLModels } from '@/hooks/useMLModels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ModelTreeNode, buildModelTree } from '@/components/ml/ModelTreeNode'
import { Brain, Plus, RefreshCw, Loader2, TrendingUp, Database, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { AddressLink } from '@/components/shared/AddressLink'

export function AIModelsView() {
  const { models, runs, loading, error, registerBaseModel, registerTrainingRun, refresh, contractAddress } = useMLModels()
  const [showBaseModelDialog, setShowBaseModelDialog] = useState(false)
  const [showTrainingRunDialog, setShowTrainingRunDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [baseModelForm, setBaseModelForm] = useState({
    name: '',
    modelHash: '',
    metadata: '',
  })

  const [trainingRunForm, setTrainingRunForm] = useState({
    inputModelId: '',
    outputModelName: '',
    outputModelHash: '',
    outputMetadata: '',
    datasetUri: '',
    datasetHash: '',
    hyperparamsHash: '',
    epochs: '',
    finalLoss: '',
    finalAccuracy: '',
    customMetrics: '',
  })

  const handleRegisterBaseModel = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      await registerBaseModel(
        baseModelForm.name,
        baseModelForm.modelHash,
        baseModelForm.metadata
      )

      setBaseModelForm({ name: '', modelHash: '', metadata: '' })
      setShowBaseModelDialog(false)
    } catch (err: any) {
      console.error('Error registering base model:', err)
      setFormError(err.message || 'Failed to register base model')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterTrainingRun = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const epochs = BigInt(trainingRunForm.epochs)
      const finalLoss = BigInt(Math.floor(parseFloat(trainingRunForm.finalLoss) * 1e6))
      const finalAccuracy = BigInt(Math.floor(parseFloat(trainingRunForm.finalAccuracy) * 1e4))

      await registerTrainingRun(
        BigInt(trainingRunForm.inputModelId),
        trainingRunForm.outputModelName,
        trainingRunForm.outputModelHash,
        trainingRunForm.outputMetadata,
        trainingRunForm.datasetUri,
        trainingRunForm.datasetHash,
        trainingRunForm.hyperparamsHash,
        epochs,
        finalLoss,
        finalAccuracy,
        trainingRunForm.customMetrics
      )

      setTrainingRunForm({
        inputModelId: '',
        outputModelName: '',
        outputModelHash: '',
        outputMetadata: '',
        datasetUri: '',
        datasetHash: '',
        hyperparamsHash: '',
        epochs: '',
        finalLoss: '',
        finalAccuracy: '',
        customMetrics: '',
      })
      setShowTrainingRunDialog(false)
    } catch (err: any) {
      console.error('Error registering training run:', err)
      setFormError(err.message || 'Failed to register training run')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    try {
      await refresh()
    } catch (err) {
      console.error('Error refreshing:', err)
    }
  }

  // Build tree structure from flat model/run lists
  const modelTrees = useMemo(() => {
    return buildModelTree(models, runs)
  }, [models, runs])

  // Count base models
  const baseModelCount = modelTrees.length

  // Track expanded state per base model
  const [expandedTrees, setExpandedTrees] = useState<Set<string>>(new Set())

  const toggleTree = (modelId: string) => {
    setExpandedTrees((prev) => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  // Count total descendants for a tree node
  const countDescendants = (node: ReturnType<typeof buildModelTree>[0]): number => {
    let count = node.children.length
    for (const child of node.children) {
      count += countDescendants(child)
    }
    return count
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Model Registry</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track ML models, training runs, and lineage on-chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBaseModelDialog(true)}
            disabled={loading}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Register Base Model
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTrainingRunDialog(true)}
            disabled={loading || models.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Log Training Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Contract Info */}
      {contractAddress && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Contract:</span>
            <AddressLink address={contractAddress} showFull className="text-sm" />
          </div>
          <Badge variant="outline" className="text-xs">ERC-721</Badge>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">Total Models</span>
              <span className="text-xl font-bold text-gray-900">{models.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">Training Runs</span>
              <span className="text-xl font-bold text-gray-900">{runs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model List */}
      {loading && models.length === 0 ? (
        <Card className="bg-white shadow-md">
          <CardContent className="py-8 text-center text-gray-500">
            Loading...
          </CardContent>
        </Card>
      ) : models.length === 0 ? (
        <Card className="bg-white shadow-md">
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No models registered yet</p>
            <Button onClick={() => setShowBaseModelDialog(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Register Base Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Model Lineages
          </h3>

          <div className="space-y-3">
            {modelTrees.map((tree) => {
              const modelIdStr = tree.model.id.toString()
              const isExpanded = expandedTrees.has(modelIdStr)
              const descendantCount = countDescendants(tree)

              return (
                <Card key={modelIdStr} className="bg-white shadow-md">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleTree(modelIdStr)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{tree.model.name}</span>
                          <Badge variant="outline" className="text-xs">#{modelIdStr}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {tree.model.owner.slice(0, 6)}...{tree.model.owner.slice(-4)}
                          {descendantCount > 0 && (
                            <span className="ml-2 text-gray-400">
                              | {descendantCount} derived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tree.children.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {tree.children.length} run{tree.children.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4 border-t">
                      <div className="pt-3 text-sm text-gray-700 space-y-1">
                        <div>Hash: <span className="font-mono text-gray-600">{tree.model.modelHash}</span></div>
                        {tree.model.metadata && (
                          <div>Metadata: {tree.model.metadata}</div>
                        )}
                      </div>

                      {tree.children.length > 0 ? (
                        <div className="mt-4 border rounded-md p-3 bg-gray-100">
                          <div className="text-sm font-medium text-gray-800 mb-2">Derived Models</div>
                          {tree.children.map((child, index) => (
                            <ModelTreeNode
                              key={child.model.id.toString()}
                              node={child}
                              depth={0}
                              isLast={index === tree.children.length - 1}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-gray-600">
                          No training runs from this model yet
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {showBaseModelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-white">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Register Base Model
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleRegisterBaseModel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    required
                    value={baseModelForm.name}
                    onChange={(e) => setBaseModelForm({ ...baseModelForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ResNet-50-ImageNet"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include architecture and variant</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Hash / Storage URI
                  </label>
                  <input
                    type="text"
                    required
                    value={baseModelForm.modelHash}
                    onChange={(e) => setBaseModelForm({ ...baseModelForm, modelHash: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="ipfs://Qm... or sha256:..."
                  />
                  <p className="text-xs text-gray-500 mt-1">IPFS CID, content hash, or storage link to model weights</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata (Optional)
                  </label>
                  <textarea
                    value={baseModelForm.metadata}
                    onChange={(e) => setBaseModelForm({ ...baseModelForm, metadata: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"framework": "pytorch", "params": "25M", "license": "MIT"}'
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">JSON with framework, parameters, license, description</p>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm text-red-600">{formError}</div>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBaseModelDialog(false)
                      setFormError(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Register Model'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showTrainingRunDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-white my-8">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Register Training Run
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleRegisterTrainingRun} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Model ID
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={trainingRunForm.inputModelId}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, inputModelId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Output Model Name
                    </label>
                    <input
                      type="text"
                      required
                      value={trainingRunForm.outputModelName}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, outputModelName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., ResNet-50-v2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Model Hash
                  </label>
                  <input
                    type="text"
                    required
                    value={trainingRunForm.outputModelHash}
                    onChange={(e) => setTrainingRunForm({ ...trainingRunForm, outputModelHash: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="ipfs://Qm... or sha256:..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Metadata (Optional)
                  </label>
                  <input
                    type="text"
                    value={trainingRunForm.outputMetadata}
                    onChange={(e) => setTrainingRunForm({ ...trainingRunForm, outputMetadata: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"notes": "fine-tuned on custom data"}'
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dataset URI
                    </label>
                    <input
                      type="text"
                      required
                      value={trainingRunForm.datasetUri}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, datasetUri: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="ipfs://Qm... or s3://bucket/path"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dataset Hash
                    </label>
                    <input
                      type="text"
                      required
                      value={trainingRunForm.datasetHash}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, datasetHash: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="sha256:abc123..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hyperparameters Hash
                  </label>
                  <input
                    type="text"
                    required
                    value={trainingRunForm.hyperparamsHash}
                    onChange={(e) => setTrainingRunForm({ ...trainingRunForm, hyperparamsHash: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="sha256:def456..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Hash of hyperparameters JSON file</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Epochs
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={trainingRunForm.epochs}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, epochs: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Final Loss
                    </label>
                    <input
                      type="number"
                      required
                      step="0.000001"
                      min="0"
                      value={trainingRunForm.finalLoss}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, finalLoss: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Final Accuracy (%)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      value={trainingRunForm.finalAccuracy}
                      onChange={(e) => setTrainingRunForm({ ...trainingRunForm, finalAccuracy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="95.50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Metrics (Optional)
                  </label>
                  <textarea
                    value={trainingRunForm.customMetrics}
                    onChange={(e) => setTrainingRunForm({ ...trainingRunForm, customMetrics: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional metrics in JSON or text format"
                    rows={2}
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm text-red-600">{formError}</div>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTrainingRunDialog(false)
                      setFormError(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Register Training Run'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
