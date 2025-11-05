import React, { useState } from 'react'
import { useManufacturerProxy } from '@/hooks/useManufacturerProxy'
import { useContractStore } from '@/store/contractStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { formatAddress } from '@/lib/utils'
import { Factory, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ManufacturerProxyPanelProps {
  onDeployProxy?: () => Promise<void>
}

export function ManufacturerProxyPanel({ onDeployProxy }: ManufacturerProxyPanelProps) {
  const { hasProxy, proxyAddress, isManufacturer, orderCount } = useManufacturerProxy()
  const { deploymentPattern, selectManufacturerProxy } = useContractStore()
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (deploymentPattern !== 'factory') {
    return null
  }

  const handleDeployProxy = async () => {
    if (!onDeployProxy) return

    setDeploying(true)
    setError(null)
    try {
      await onDeployProxy()
    } catch (error: any) {
      console.error('Deploy proxy error:', error)
      setError(error.message || 'Failed to deploy proxy')
    } finally {
      setDeploying(false)
    }
  }

  const handleViewMyOrders = () => {
    if (proxyAddress) {
      selectManufacturerProxy(proxyAddress)
    }
  }

  // Not a registered manufacturer
  if (!isManufacturer) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Your Manufacturer Proxy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <div className="text-sm text-gray-600 mb-2">Not Registered</div>
            <p className="text-xs text-gray-500">
              You are not a registered manufacturer. Contact the administrator to get registered.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Manufacturer without proxy
  if (!hasProxy) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Your Manufacturer Proxy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div>
              <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <Badge variant="warning" className="mb-2">Not Deployed</Badge>
            </div>

            <Button
              onClick={handleDeployProxy}
              disabled={deploying || !onDeployProxy}
              size="lg"
              className="w-full"
            >
              {deploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Factory className="mr-2 h-4 w-4" />
                  Deploy Your Proxy
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>Deploy your own logistics management contract to start creating orders.</p>
              <p className="text-gray-400">Estimated gas: ~500k</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Manufacturer with deployed proxy
  return (
    <Card className="bg-white shadow-md border-green-200">
      <CardHeader className="border-b bg-green-50">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg">Your Manufacturer Proxy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <Badge variant="success">Deployed</Badge>
            </div>
          </div>

          {/* Proxy Address */}
          <div>
            <span className="text-sm text-gray-600 block mb-1">Proxy Address:</span>
            <div className="font-mono text-xs bg-gray-50 p-2 rounded border">
              {proxyAddress}
            </div>
          </div>

          {/* Order Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Orders:</span>
            <span className="font-semibold text-lg">{orderCount.toString()}</span>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleViewMyOrders}
              variant="default"
              size="sm"
              className="w-full"
            >
              View My Orders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
