import React, { useState } from 'react'
import { useAddressData } from '@/hooks/useAddressData'
import { useAddressTransactions } from '@/hooks/useAddressTransactions'
import { useAddressEvents } from '@/hooks/useAddressEvents'
import { useTransactionExport } from '@/hooks/useTransactionExport'
import { useEventExport } from '@/hooks/useEventExport'
import { useContractStore } from '@/store/contractStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { FunctionForm } from './FunctionForm'
import { TransactionList } from './TransactionList'
import { ArrowLeft, Copy, ExternalLink, Download } from 'lucide-react'
import { decodeEventLog } from 'viem'
import type { Address, Hash } from 'viem'
import type { ContractFunction } from '@/types/contracts'

interface ContractPageProps {
  address: Address
  onBack?: () => void
  onViewTransaction?: (txHash: Hash) => void
  onViewAddress?: (address: string) => void
  onViewAccount?: (address: Address) => void
}

type TabType = 'read' | 'write' | 'events' | 'transactions' | 'code'

export function ContractPage({
  address,
  onBack,
  onViewTransaction,
  onViewAddress,
  onViewAccount,
}: ContractPageProps) {
  const { addressInfo, loading: infoLoading } = useAddressData(address)
  const { transactions, loading: txLoading } = useAddressTransactions(address)
  const { events, loading: eventsLoading } = useAddressEvents(address)
  const { contracts } = useContractStore()
  const { exportTransactions, isExporting } = useTransactionExport()
  const { exportEvents } = useEventExport()
  const [activeTab, setActiveTab] = useState<TabType>('read')
  const [openFunctions, setOpenFunctions] = useState<Record<string, boolean>>({})

  const contract = contracts.find((c) => c.address.toLowerCase() === address.toLowerCase())

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleToggleFunction = (key: string) => {
    setOpenFunctions((prev) => ({ ...prev, [key]: !prev[key] }))
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

  const formatBalance = (balance: bigint) => {
    const eth = Number(balance) / 1e18
    return eth.toFixed(4).replace(/\.?0+$/, '')
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
    if (!contract) {
      console.log('[ContractPage] decodeLog: no contract found')
      return null
    }

    try {
      const decoded = decodeEventLog({
        abi: contract.abi,
        data: log.data as Hash,
        topics: log.topics,
      })
      console.log('[ContractPage] Successfully decoded event:', decoded.eventName)
      return decoded
    } catch (error) {
      console.error('[ContractPage] Failed to decode event:', error)
      console.log('[ContractPage] Event data:', { address: log.address, topics: log.topics, data: log.data })
      console.log('[ContractPage] Contract:', contract.name, 'ABI events:', contract.abi.filter((item: any) => item.type === 'event').map((e: any) => e.name))
      return null
    }
  }

  if (infoLoading || !contract) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {infoLoading ? 'Loading contract information...' : 'Contract not found'}
        </CardContent>
      </Card>
    )
  }

  const functions = getContractFunctions(contract.abi)
  const readFunctions = filterFunctions(functions, 'read')
  const writeFunctions = filterFunctions(functions, 'write')

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
                <CardTitle>{contract.name}</CardTitle>
                <Badge variant="default">Contract</Badge>
                {contract.isProxy && (
                  <Badge variant="warning">{contract.proxyType} Proxy</Badge>
                )}
              </div>
              <CardDescription>
                Smart contract interface
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Contract Info */}
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

              {addressInfo && (
                <>
                  <div className="text-gray-500">Balance:</div>
                  <div className="font-medium">{formatBalance(addressInfo.balance)} ETH</div>

                  <div className="text-gray-500">Transactions:</div>
                  <div className="font-medium">{addressInfo.transactionCount}</div>
                </>
              )}

              {contract.implementation && (
                <>
                  <div className="text-gray-500">Implementation:</div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {contract.implementation}
                    {onViewAddress && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onViewAddress(contract.implementation!)}
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
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b p-0">
          <div className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab('read')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'read'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Read ({readFunctions.length})
            </button>
            <button
              onClick={() => setActiveTab('write')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'write'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Write ({writeFunctions.length})
            </button>
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
              onClick={() => setActiveTab('code')}
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'code'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Code
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Read Tab */}
          {activeTab === 'read' && (
            <div className="space-y-3">
              {readFunctions.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No read functions available</div>
              ) : (
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
                })
              )}
            </div>
          )}

          {/* Write Tab */}
          {activeTab === 'write' && (
            <div className="space-y-3">
              {writeFunctions.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No write functions available</div>
              ) : (
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
                })
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              {eventsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No events found</div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => exportEvents(events, address, contract.abi)}
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
                      {events.map((event) => {
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

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <>
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
            </>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && addressInfo && (
            <div className="space-y-4">
              {/* Verification Status */}
              {contract.sourceCode && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Contract Source Code Verified</span>
                </div>
              )}

              {/* Source Code (if available) */}
              {contract.sourceCode ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Contract Source Code (Solidity)</h3>
                  <div className="bg-gray-50 p-4 rounded border font-mono text-xs max-h-[500px] overflow-y-auto whitespace-pre">
                    {contract.sourceCode}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Contract Bytecode</h3>
                  <div className="bg-gray-50 p-4 rounded border font-mono text-xs break-all max-h-96 overflow-y-auto">
                    {addressInfo.code || 'No bytecode available'}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Contract ABI</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-xs break-all max-h-96 overflow-y-auto">
                  {JSON.stringify(contract.abi, null, 2)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
