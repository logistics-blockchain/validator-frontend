import React, { useState } from 'react'
import { useAddressData } from '@/hooks/useAddressData'
import { useAddressTransactions } from '@/hooks/useAddressTransactions'
import { useAddressEvents } from '@/hooks/useAddressEvents'
import { useAddressNFTs } from '@/hooks/useAddressNFTs'
import { useTransactionExport } from '@/hooks/useTransactionExport'
import { useEventExport } from '@/hooks/useEventExport'
import { useContractStore } from '@/store/contractStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TransactionList } from '@/components/explorer/TransactionList'
import { ArrowLeft, Copy, ExternalLink, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { decodeEventLog } from 'viem'
import type { Address, Hash } from 'viem'

interface AccountPageProps {
  address: Address
  onBack?: () => void
  onViewTransaction?: (txHash: Hash) => void
  onViewAddress?: (address: string) => void
  onViewContract?: (address: Address) => void
}

type TabType = 'transactions' | 'nfts' | 'events' | 'code'

export function AccountPage({
  address,
  onBack,
  onViewTransaction,
  onViewAddress,
  onViewContract,
}: AccountPageProps) {
  const { addressInfo, loading: infoLoading } = useAddressData(address)
  const { transactions, loading: txLoading } = useAddressTransactions(address)
  const { events, loading: eventsLoading } = useAddressEvents(address)
  const { nfts, loading: nftsLoading } = useAddressNFTs(address)
  const { exportTransactions, isExporting } = useTransactionExport()
  const { exportEvents } = useEventExport()
  const { contracts } = useContractStore()
  const [activeTab, setActiveTab] = useState<TabType>('transactions')
  const [openNfts, setOpenNfts] = useState<Record<string, boolean>>({})

  // Check if this address is a known contract in our store
  const isKnownContract = contracts.some(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatBalance = (balance: bigint) => {
    const eth = Number(balance) / 1e18
    return eth.toFixed(4).replace(/\.?0+$/, '')
  }

  const handleToggleNft = (key: string) => {
    setOpenNfts((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getOrderStateString = (state: number) => {
    const states = ['Created', 'PickedUp', 'InTransit', 'AtFacility', 'Delivered']
    return states[state] || 'Unknown'
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - Number(timestamp)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  // Try to decode event log
  const decodeLog = (log: { address: string; topics: Hash[]; data: string }) => {
    const contract = contracts.find((c) => c.address.toLowerCase() === log.address.toLowerCase())
    if (!contract) return null

    try {
      return decodeEventLog({
        abi: contract.abi,
        data: log.data as Hash,
        topics: log.topics,
      })
    } catch {
      return null
    }
  }

  if (infoLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading address information...
        </CardContent>
      </Card>
    )
  }

  if (!addressInfo) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-600 font-medium">Address not found</div>
          {onBack && (
            <Button onClick={onBack} className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-grow">
              <div className="flex items-center gap-3">
                <CardTitle>Address Details</CardTitle>
                {addressInfo.isContract ? (
                  <Badge variant="default">Contract</Badge>
                ) : (
                  <Badge variant="outline">EOA</Badge>
                )}
                {addressInfo.isProxy && (
                  <Badge variant="warning">{addressInfo.proxyType} Proxy</Badge>
                )}
              </div>
              <CardDescription>
                {addressInfo.contractName || 'Blockchain address'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Address */}
            <div className="grid grid-cols-[150px_1fr] gap-y-3 text-sm">
              <div className="text-gray-500">Address:</div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {address}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(address)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Balance:</div>
              <div className="font-medium">{formatBalance(addressInfo.balance)} ETH</div>

              <div className="text-gray-500">Transactions:</div>
              <div className="font-medium">{addressInfo.transactionCount}</div>

              {addressInfo.contractName && (
                <>
                  <div className="text-gray-500">Contract Name:</div>
                  <div className="font-medium">{addressInfo.contractName}</div>
                </>
              )}

              {addressInfo.implementation && (
                <>
                  <div className="text-gray-500">Implementation:</div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {addressInfo.implementation}
                    {onViewAddress && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onViewAddress(addressInfo.implementation!)}
                        className="h-6 w-6"
                        title="View implementation"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            {!addressInfo.isContract && (
            <div className="pt-4 border-t flex gap-2">
              <Button
                onClick={() => setActiveTab('nfts')}
                variant={nfts.length > 0 ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                View NFTs ({nftsLoading ? '...' : nfts.length})
              </Button>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b p-0">
          <div className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('nfts')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'nfts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              NFTs ({nfts.length})
            </button>
            {addressInfo.isContract && (
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  activeTab === 'events'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Events ({events.length})
              </button>
            )}
            {addressInfo.isContract && (
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  activeTab === 'code'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Code
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="p-4">
              {transactions.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => exportTransactions(transactions, address)}
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              )}
              <TransactionList
                transactions={transactions}
                loading={txLoading}
                onViewTransaction={onViewTransaction}
                onViewAddress={onViewAddress}
              />
            </div>
          )}

          {/* NFTs Tab */}
          {activeTab === 'nfts' && (
            <div className="p-4">
              {nftsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading NFTs...</div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No NFTs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contract
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Token ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nfts.map((nft) => {
                        const key = `${nft.contractAddress}-${nft.tokenId}`
                        const isOpen = openNfts[key]
                        return (
                          <React.Fragment key={key}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                                  onClick={() => onViewContract?.(nft.contractAddress)}
                                >
                                  {nft.contractName}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                #{nft.tokenId.toString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {nft.order ? (
                                  <Badge variant="default">
                                    {getOrderStateString(nft.order.state)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-gray-500">No order data</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {nft.order && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleNft(key)}
                                    className="gap-2"
                                  >
                                    {isOpen ? (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        Hide Details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronRight className="h-4 w-4" />
                                        Show Details
                                      </>
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                            {isOpen && nft.order && (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 bg-blue-50">
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Manufacturer:</span>
                                        <div
                                          className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline mt-1"
                                          onClick={() => onViewAddress?.(nft.order!.manufacturer)}
                                        >
                                          {nft.order.manufacturer}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Receiver:</span>
                                        <div
                                          className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline mt-1"
                                          onClick={() => onViewAddress?.(nft.order!.receiver)}
                                        >
                                          {nft.order.receiver}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Created:</span>
                                        <div className="font-medium mt-1">
                                          {new Date(Number(nft.order.createdAt) * 1000).toLocaleString()}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">IPFS Hash:</span>
                                        <div className="font-mono text-xs mt-1 break-all">
                                          {nft.order.ipfsHash}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
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
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && addressInfo.isContract && (
            <div className="p-4">
              {eventsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No events found</div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => exportEvents(events, address)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Block
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event, index) => {
                        const decoded = decodeLog(event)
                        return (
                          <tr
                            key={`${event.transactionHash}-${event.logIndex}`}
                            className={`${onViewTransaction ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                            onClick={() => onViewTransaction?.(event.transactionHash)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {event.blockNumber.toString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {event.timestamp ? formatTimeAgo(event.timestamp) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                              {event.transactionHash.slice(0, 10)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {decoded ? (
                                <Badge variant="default" className="text-xs">
                                  {decoded.eventName}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">Unknown Event</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && addressInfo.isContract && (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Contract Bytecode</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-xs break-all max-h-96 overflow-y-auto">
                  {addressInfo.code || 'No bytecode available'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
