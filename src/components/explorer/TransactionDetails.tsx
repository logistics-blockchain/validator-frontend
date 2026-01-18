import React from 'react'
import { useTransaction } from '@/hooks/useBlockHistory'
import { useContractStore } from '@/store/contractStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatAddress } from '@/lib/utils'
import { Copy, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { decodeEventLog } from 'viem'
import type { Hash, Abi } from 'viem'

interface TransactionDetailsProps {
  txHash: Hash | null
  onBack?: () => void
  onViewAddress?: (address: string) => void
}

export function TransactionDetails({ txHash, onBack, onViewAddress }: TransactionDetailsProps) {
  const { transaction, receipt, loading } = useTransaction(txHash)
  const { contracts } = useContractStore()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatValue = (value: bigint) => {
    // Convert wei to ether
    const eth = Number(value) / 1e18
    return eth === 0 ? '0' : eth.toFixed(18).replace(/\.?0+$/, '')
  }

  // Try to decode event log using available ABIs
  const decodeLog = (log: { address: string; topics: Hash[]; data: string }) => {
    // Find contract by address (case-insensitive)
    const contract = contracts.find((c) => c.address.toLowerCase() === log.address.toLowerCase())

    if (!contract) {
      console.log('[EventDecoder] No contract found for address:', log.address)
      console.log('[EventDecoder] Available contracts:', contracts.map(c => ({ name: c.name, address: c.address })))
      return null
    }

    console.log('[EventDecoder] Found contract:', contract.name, 'for address:', log.address)

    // For proxy contracts, the ABI already points to the implementation ABI
    const abiToUse = contract.abi

    try {
      const decoded = decodeEventLog({
        abi: abiToUse,
        data: log.data as Hash,
        topics: log.topics,
      })
      console.log('[EventDecoder] Successfully decoded event:', decoded.eventName)
      return decoded
    } catch (error) {
      console.log('[EventDecoder] Failed to decode with primary ABI, trying all ABIs...')

      // If decoding fails with the contract's ABI, try all other ABIs
      // (sometimes events come from related contracts)
      for (const otherContract of contracts) {
        if (otherContract.address.toLowerCase() === contract.address.toLowerCase()) continue

        try {
          const decoded = decodeEventLog({
            abi: otherContract.abi,
            data: log.data as Hash,
            topics: log.topics,
          })
          console.log('[EventDecoder] Successfully decoded with', otherContract.name, 'ABI:', decoded.eventName)
          return decoded
        } catch {
          // Continue to next ABI
        }
      }

      console.log('[EventDecoder] All ABIs failed to decode event')
      return null
    }
  }

  if (!txHash) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No transaction selected
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading transaction details...
        </CardContent>
      </Card>
    )
  }

  if (!transaction) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-600 font-medium">Transaction not found</div>
          <div className="text-sm text-gray-600 mt-2">
            Transaction {formatAddress(txHash)} could not be loaded
          </div>
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
      {/* Transaction Header */}
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
                <CardTitle>Transaction Details</CardTitle>
                {transaction.status && (
                  <Badge
                    variant={transaction.status === 'success' ? 'success' : 'destructive'}
                    className="gap-1"
                  >
                    {transaction.status === 'success' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {transaction.status === 'success' ? 'Success' : 'Reverted'}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Transaction information and execution details
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Transaction Information Grid */}
            <div className="grid grid-cols-[200px_1fr] gap-y-3 text-sm">
              <div className="text-gray-500">Transaction Hash:</div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {transaction.hash}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(transaction.hash)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Status:</div>
              <div>
                {transaction.status === 'success' ? (
                  <span className="text-green-600 font-medium">Success</span>
                ) : transaction.status === 'reverted' ? (
                  <span className="text-red-600 font-medium">Reverted</span>
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>

              <div className="text-gray-500">Block Number:</div>
              <div className="font-medium">{transaction.blockNumber.toString()}</div>

              <div className="text-gray-500">Block Hash:</div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {transaction.blockHash}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(transaction.blockHash)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Transaction Index:</div>
              <div>{transaction.transactionIndex}</div>

              <div className="text-gray-500">From:</div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline"
                  onClick={() => onViewAddress?.(transaction.from)}
                >
                  {transaction.from}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(transaction.from)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">To:</div>
              <div className="flex items-center gap-2">
                {transaction.to ? (
                  <>
                    <span
                      className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline"
                      onClick={() => onViewAddress?.(transaction.to!)}
                    >
                      {transaction.to}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(transaction.to!)}
                      className="h-6 w-6"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="font-mono text-xs text-gray-400">Contract Creation</span>
                )}
              </div>

              <div className="text-gray-500">Value:</div>
              <div className="font-medium">{formatValue(transaction.value)} ETH</div>

              <div className="text-gray-500">Nonce:</div>
              <div>{transaction.nonce}</div>

              <div className="text-gray-500">Input Data:</div>
              <div className="break-all font-mono text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                {transaction.input}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Information */}
      {receipt && (
        <Card className="bg-white shadow-md">
          <CardHeader className="border-b">
            <CardTitle>Receipt Information</CardTitle>
            <CardDescription>
              Transaction execution results
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-[200px_1fr] gap-y-3 text-sm">
                <div className="text-gray-500">Status:</div>
                <div>
                  {receipt.status === 'success' ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Reverted
                    </Badge>
                  )}
                </div>

                {receipt.contractAddress && (
                  <>
                    <div className="text-gray-500">Contract Address:</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => onViewAddress?.(receipt.contractAddress!)}
                      >
                        {receipt.contractAddress}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(receipt.contractAddress!)}
                        className="h-6 w-6"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                <div className="text-gray-500">Logs Count:</div>
                <div className="font-medium">{receipt.logs.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Logs */}
      {receipt && receipt.logs.length > 0 && (
        <Card className="bg-white shadow-md">
          <CardHeader className="border-b">
            <CardTitle>Event Logs ({receipt.logs.length})</CardTitle>
            <CardDescription>
              Events emitted during transaction execution
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {receipt.logs.map((log, index) => {
                const decoded = decodeLog(log)
                const contractName = contracts.find(
                  (c) => c.address.toLowerCase() === log.address.toLowerCase()
                )?.name

                return (
                  <div key={`${log.transactionHash}-${log.logIndex}`} className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Log {log.logIndex}</span>
                          {decoded && (
                            <Badge variant="default" className="text-xs">
                              {decoded.eventName}
                            </Badge>
                          )}
                          {contractName && (
                            <Badge variant="outline" className="text-xs">
                              {contractName}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.topics.length} topics
                        </Badge>
                      </div>

                      {/* Decoded Event Args (if available) */}
                      {decoded && decoded.args && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-semibold text-blue-900 mb-2">Decoded Parameters:</div>
                          <div className="space-y-1">
                            {Object.entries(decoded.args).map(([key, value]) => {
                              // Skip numeric keys (they're duplicates of named keys)
                              if (!isNaN(Number(key))) return null

                              // Check if value looks like an address (0x + 40 hex chars)
                              const isAddress = typeof value === 'string' &&
                                               value.startsWith('0x') &&
                                               value.length === 42

                              return (
                                <div key={key} className="grid grid-cols-[140px_1fr] gap-2 text-xs">
                                  <span className="text-blue-700 font-medium">{key}:</span>
                                  {isAddress ? (
                                    <span
                                      className="font-mono text-blue-600 hover:text-blue-800 cursor-pointer underline break-all"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onViewAddress?.(value)
                                      }}
                                    >
                                      {value}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-blue-900 break-all">
                                      {typeof value === 'bigint'
                                        ? value.toString()
                                        : typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Raw Data (always show) */}
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900 select-none">
                          {decoded ? 'Show raw data' : 'Raw data'}
                        </summary>
                        <div className="mt-2 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                          <div className="text-gray-500">Address:</div>
                          <div
                            className="font-mono text-xs break-all text-blue-600 hover:text-blue-800 cursor-pointer underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewAddress?.(log.address)
                            }}
                          >
                            {log.address}
                          </div>

                          {log.topics.map((topic, topicIndex) => (
                            <React.Fragment key={topicIndex}>
                              <div className="text-gray-500">Topic {topicIndex}:</div>
                              <div className="font-mono text-xs break-all">{topic}</div>
                            </React.Fragment>
                          ))}

                          <div className="text-gray-500">Data:</div>
                          <div className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                            {log.data}
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
