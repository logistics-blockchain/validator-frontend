import React from 'react'
import { useContractStore } from '@/store/contractStore'
import { useAccountStore, selectCurrentAccount } from '@/store/accountStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'
import { formatAddress } from '@/lib/utils'
import { Building2, ChevronDown } from 'lucide-react'
import type { Address } from 'viem'

export function ProxySelector() {
  const { deploymentPattern, manufacturerProxies, selectedManufacturerProxy, selectManufacturerProxy } = useContractStore()
  const currentAccount = useAccountStore(selectCurrentAccount)

  // Only show in factory mode
  if (deploymentPattern !== 'factory') {
    return null
  }

  // Filter out manufacturers without deployed proxies
  const deployedProxies = manufacturerProxies.filter(
    (p) => p.proxyAddress !== '0x0000000000000000000000000000000000000000'
  )

  // No proxies deployed yet
  if (deployedProxies.length === 0) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">View Orders From</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-500 py-2">
            No manufacturer proxies deployed yet
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find current account's proxy
  const myProxy = deployedProxies.find(
    (p) => p.manufacturer.toLowerCase() === currentAccount?.toLowerCase()
  )

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    selectManufacturerProxy(value ? (value as Address) : null)
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">View Orders From</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="relative">
            <select
              value={selectedManufacturerProxy || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         appearance-none cursor-pointer bg-white"
            >
              <option value="">Select a manufacturer...</option>

              {/* Current account's proxy first (if exists) */}
              {myProxy && (
                <option value={myProxy.proxyAddress}>
                  🏭 My Proxy - {myProxy.manufacturerName || 'Unknown'} ({formatAddress(myProxy.proxyAddress)})
                </option>
              )}

              {/* Other manufacturers */}
              {deployedProxies
                .filter((p) => p.manufacturer.toLowerCase() !== currentAccount?.toLowerCase())
                .map((proxy) => (
                  <option key={proxy.proxyAddress} value={proxy.proxyAddress}>
                    {proxy.manufacturerName || 'Unknown'} ({formatAddress(proxy.proxyAddress)})
                  </option>
                ))}
            </select>

            {/* Dropdown icon */}
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Selected proxy info */}
          {selectedManufacturerProxy && (() => {
            const selectedProxy = deployedProxies.find(
              (p) => p.proxyAddress === selectedManufacturerProxy
            )

            if (!selectedProxy) return null

            const isMyProxy = selectedProxy.manufacturer.toLowerCase() === currentAccount?.toLowerCase()

            return (
              <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Selected Manufacturer:</span>
                  {isMyProxy && <Badge variant="default" className="text-xs">Your Proxy</Badge>}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {selectedProxy.manufacturerName || 'Unknown'}
                  </div>

                  <div className="font-mono text-xs text-gray-600">
                    Manufacturer: {formatAddress(selectedProxy.manufacturer)}
                  </div>

                  <div className="font-mono text-xs text-gray-600">
                    Proxy: {formatAddress(selectedProxy.proxyAddress)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-gray-500">Total Orders:</span>
                    <span className="text-sm font-semibold">{selectedProxy.orderCount.toString()}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Helper text */}
          <div className="text-xs text-gray-500 pt-2">
            Select a manufacturer to view their orders
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
