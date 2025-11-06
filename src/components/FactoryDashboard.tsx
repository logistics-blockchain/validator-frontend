import React from 'react'
import { useContractStore } from '@/store/contractStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddressLink } from './AddressLink'
import { formatAddress } from '@/lib/utils'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'

export function FactoryDashboard() {
  const { factoryInfo, selectManufacturerProxy } = useContractStore()

  if (!factoryInfo) {
    return null
  }

  const handleViewProxy = (proxyAddress: string) => {
    selectManufacturerProxy(proxyAddress as `0x${string}`)
  }

  return (
    <div>
      {/* Combined Factory Overview and Manufacturer Proxies */}
      <Card className="bg-white shadow-md overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Factory System Overview</CardTitle>
          <CardDescription>
            Logistics Order Factory - Each manufacturer has their own proxy contract
          </CardDescription>
        </CardHeader>

        {/* Factory Stats */}
        <CardContent className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Factory Address:</span>
              <div className="text-xs mt-1">
                <AddressLink address={factoryInfo.factoryAddress} />
              </div>
            </div>
            <div>
              <span className="text-gray-500">Implementation:</span>
              <div className="text-xs mt-1">
                <AddressLink address={factoryInfo.implementation} />
              </div>
            </div>
            <div>
              <span className="text-gray-500">Registry:</span>
              <div className="text-xs mt-1">
                <AddressLink address={factoryInfo.registry} />
              </div>
            </div>
            <div>
              <span className="text-gray-500">Total Proxies Deployed:</span>
              <div className="font-semibold mt-1">{factoryInfo.totalProxies}</div>
            </div>
          </div>
        </CardContent>

        {/* Manufacturer Proxies Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proxy Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factoryInfo.manufacturers.map((mfr) => {
                  const hasProxy = mfr.proxyAddress !== '0x0000000000000000000000000000000000000000'

                  return (
                    <tr key={mfr.manufacturer} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasProxy ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <AddressLink address={mfr.manufacturer} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {mfr.manufacturerName || 'Unknown'}
                        </div>
                        {!mfr.isActive && (
                          <Badge variant="destructive" className="text-xs mt-1">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasProxy ? (
                          <div className="text-xs">
                            <AddressLink address={mfr.proxyAddress} />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not deployed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {hasProxy ? mfr.orderCount.toString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasProxy ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProxy(mfr.proxyAddress)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {factoryInfo.manufacturers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No manufacturers registered yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
