import React, { useState } from 'react'
import { useContractStore } from '@/store/contractStore'
import { FunctionForm } from './FunctionForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { formatAddress } from '@/lib/utils'
import { Copy, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import type { ContractFunction, Order } from '@/types/contracts'
import type { Address } from 'viem'

const getOrderStateString = (state: number) => {
  const states = ['Created', 'PickedUp', 'InTransit', 'AtFacility', 'Delivered']
  return states[state] || 'Unknown'
}

export function ContractDashboard() {
  const {
    contracts,
    loading,
    error,
    nfts,
    nftLoading,
    fetchNftsForContract,
    deploymentPattern,
    selectedManufacturerProxy,
  } = useContractStore()
  const [selectedTab, setSelectedTab] = useState<Record<string, 'read' | 'write'>>({})
  const [openFunctions, setOpenFunctions] = useState<Record<string, boolean>>({})
  const [openNfts, setOpenNfts] = useState<Record<string, boolean>>({})
  const [selectedNftContract, setSelectedNftContract] = useState<Address | '' >('')
  const [selectedContractAddress, setSelectedContractAddress] = useState<Address | ''>('')

  // Auto-select manufacturer proxy in factory mode (must be at top, before any returns)
  const isFactoryMode = deploymentPattern === 'factory'

  // Track the last auto-selected proxy to avoid re-selecting it repeatedly
  const [lastAutoSelectedProxy, setLastAutoSelectedProxy] = React.useState<Address | null>(null)

  React.useEffect(() => {
    if (isFactoryMode && selectedManufacturerProxy && selectedManufacturerProxy !== selectedNftContract) {
      setSelectedNftContract(selectedManufacturerProxy)
    }
  }, [isFactoryMode, selectedManufacturerProxy, selectedNftContract])

  // Auto-select the proxy in the Contract Overview dropdown only when a NEW proxy is selected
  React.useEffect(() => {
    if (isFactoryMode && selectedManufacturerProxy && selectedManufacturerProxy !== lastAutoSelectedProxy) {
      setSelectedContractAddress(selectedManufacturerProxy)
      setLastAutoSelectedProxy(selectedManufacturerProxy)
    }
  }, [isFactoryMode, selectedManufacturerProxy, lastAutoSelectedProxy])

  const handleToggleNft = (tokenId: string) => {
    setOpenNfts((prev) => ({ ...prev, [tokenId]: !prev[tokenId] }))
  }

  const handleToggleFunction = (key: string) => {
    setOpenFunctions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }


  const handleFetchNfts = () => {
    if (!selectedNftContract) return
    const contract = contracts.find((c) => c.address === selectedNftContract)
    if (contract) {
      fetchNftsForContract(contract.address, contract.abi)
    }
  }

  const getContractFunctions = (abi: any[]): ContractFunction[] => {
    return abi.filter((item) => item.type === 'function') as ContractFunction[]
  }

  const filterFunctions = (functions: ContractFunction[], type: 'read' | 'write') => {
    if (type === 'read') {
      return functions.filter((f) => f.stateMutability === 'view' || f.stateMutability === 'pure')
    } else {
      return functions.filter(
        (f) => f.stateMutability === 'nonpayable' || f.stateMutability === 'payable'
      )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Loading contracts...</CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-600 font-medium">Error loading contracts</div>
          <div className="text-sm text-gray-600 mt-2">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No contracts deployed yet. Deploy contracts first using the deployment script.
        </CardContent>
      </Card>
    )
  }

  // Filter proxy contracts based on mode
  const proxyContracts = isFactoryMode
    ? [] // In factory mode, we don't show individual proxies in dropdown (use ProxySelector instead)
    : contracts.filter((c) => c.isProxy)

  // In factory mode, if a manufacturer proxy is selected, show it for viewing orders
  const viewableContract = isFactoryMode && selectedManufacturerProxy
    ? selectedManufacturerProxy
    : selectedNftContract

  const currentNfts = viewableContract ? nfts[viewableContract] : []
  const isNftLoading = viewableContract ? nftLoading[viewableContract] : false

  return (
    <div className="space-y-6">

      {/* NFT Orders Card */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {isFactoryMode
              ? 'View orders from the selected manufacturer proxy'
              : 'View all minted order NFTs for a selected contract'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Shared Proxy Mode: Show dropdown selector */}
          {!isFactoryMode && (
            <div className="flex items-center gap-4 mb-4">
              <select
                value={selectedNftContract}
                onChange={(e) => setSelectedNftContract(e.target.value as Address | '')}
                className="flex-grow p-2 border rounded-md text-sm bg-white border-gray-300"
              >
                <option value="">-- Select a Logistics Contract --</option>
                {proxyContracts.map((p) => (
                  <option key={p.address} value={p.address}>
                    {p.name} ({formatAddress(p.address)})
                  </option>
                ))}
              </select>
              <Button onClick={handleFetchNfts} disabled={!selectedNftContract || isNftLoading}>
                {isNftLoading ? 'Fetching...' : 'Fetch Orders'}
              </Button>
            </div>
          )}

          {/* Factory Mode: Show fetch button */}
          {isFactoryMode && (
            <div className="mb-4">
              {selectedManufacturerProxy ? (
                <Button
                  onClick={handleFetchNfts}
                  disabled={isNftLoading}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isNftLoading ? 'animate-spin' : ''}`} />
                  {isNftLoading ? 'Fetching...' : 'Fetch Orders'}
                </Button>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Click "View" on a manufacturer proxy above to see their orders
                </div>
              )}
            </div>
          )}

          {isNftLoading && (
            <div className="text-center text-gray-500 py-4">Loading NFT orders...</div>
          )}

          {currentNfts && currentNfts.length > 0 && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentNfts.map((order) => {
                    const tokenIdStr = order.tokenId.toString()
                    const isNftOpen = !!openNfts[tokenIdStr]
                    return (
                      <React.Fragment key={tokenIdStr}>
                        <tr onClick={() => handleToggleNft(tokenIdStr)} className="cursor-pointer even:bg-gray-50 hover:bg-blue-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-3">
                              {isNftOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {tokenIdStr}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Badge variant="outline">{getOrderStateString(order.state)}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{formatAddress(order.manufacturer)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{formatAddress(order.receiver)}</td>
                        </tr>
                        {isNftOpen && (
                          <tr className="bg-gray-100">
                            <td colSpan={4} className="p-4">
                              <pre className="text-xs overflow-auto whitespace-pre-wrap break-all bg-white p-3 rounded border-gray-300 border">
                                {JSON.stringify(
                                  order,
                                  (key, value) => (typeof value === 'bigint' ? value.toString() : value),
                                  2
                                )}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isNftLoading && currentNfts && currentNfts.length === 0 && selectedNftContract && (
            <div className="text-center text-gray-500 py-4">No NFTs found for this contract.</div>
          )}
        </CardContent>
      </Card>

      {/* Unified Contract Overview */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-lg">Contract Overview</CardTitle>
          <CardDescription>
            Select a contract to view and interact with its functions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Contract Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Contract</label>
            <select
              value={selectedContractAddress}
              onChange={(e) => setSelectedContractAddress(e.target.value as Address | '')}
              className="w-full p-2 border rounded-md text-sm bg-white border-gray-300"
            >
              <option value="">-- Select a contract --</option>
              {contracts.map((contract) => (
                <option key={contract.address} value={contract.address}>
                  {contract.name} ({formatAddress(contract.address)})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Contract Details */}
          {selectedContractAddress && (() => {
            const contract = contracts.find(c => c.address === selectedContractAddress)
            if (!contract) return null

            const functions = getContractFunctions(contract.abi)
            const readFunctions = filterFunctions(functions, 'read')
            const writeFunctions = filterFunctions(functions, 'write')
            const currentTab = selectedTab[contract.address] || 'read'

            return (
              <div className="space-y-4">
                {/* Contract Info */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-[150px_1fr] gap-y-2 text-sm">
                    <div className="text-gray-500">Contract Name:</div>
                    <div className="font-medium">{contract.name}</div>

                    <div className="text-gray-500">Address:</div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {contract.address}
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(contract.address)} className="h-6 w-6">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {contract.isProxy && (
                      <>
                        <div className="text-gray-500">Proxy Type:</div>
                        <div><Badge variant="warning">{contract.proxyType} Proxy</Badge></div>

                        <div className="text-gray-500">Implementation:</div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          {contract.implementation}
                          <Button size="icon" variant="ghost" onClick={() => copyToClipboard(contract.implementation!)} className="h-6 w-6">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setSelectedTab((prev) => ({ ...prev, [contract.address]: 'read' }))}
                    className={`px-4 py-2 font-medium text-sm ${currentTab === 'read' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    Read ({readFunctions.length})
                  </button>
                  <button
                    onClick={() => setSelectedTab((prev) => ({ ...prev, [contract.address]: 'write' }))}
                    className={`px-4 py-2 font-medium text-sm ${currentTab === 'write' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    Write ({writeFunctions.length})
                  </button>
                </div>

                {/* Function List */}
                <div className="space-y-3">
                  {currentTab === 'read' && readFunctions.length === 0 && (
                    <div className="text-gray-500 text-center py-4">No read functions available</div>
                  )}
                  {currentTab === 'write' && writeFunctions.length === 0 && (
                    <div className="text-gray-500 text-center py-4">No write functions available</div>
                  )}

                  {currentTab === 'read' &&
                    readFunctions.map((func, index) => {
                      const key = `${contract.address}-${func.name}-${index}`
                      return (
                        <FunctionForm
                          key={key}
                          func={func}
                          funcIndex={index + 1}
                          contractAddress={contract.address}
                          contractAbi={contract.abi}
                          isOpen={!!openFunctions[key]}
                          onToggle={() => handleToggleFunction(key)}
                        />
                      )
                    })}
                  {currentTab === 'write' &&
                    writeFunctions.map((func, index) => {
                      const key = `${contract.address}-${func.name}-${index}`
                      return (
                        <FunctionForm
                          key={key}
                          func={func}
                          funcIndex={index + 1}
                          contractAddress={contract.address}
                          contractAbi={contract.abi}
                          isOpen={!!openFunctions[key]}
                          onToggle={() => handleToggleFunction(key)}
                        />
                      )
                    })}
                </div>
              </div>
            )
          })()}

          {!selectedContractAddress && (
            <div className="text-center py-8 text-gray-500">
              Please select a contract from the dropdown above
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
