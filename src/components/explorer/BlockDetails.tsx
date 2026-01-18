import React, { useState } from 'react'
import { useBlock } from '@/hooks/useBlockHistory'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatAddress } from '@/lib/utils'
import { Copy, ChevronRight, ArrowLeft } from 'lucide-react'
import type { Hash } from 'viem'

interface BlockDetailsProps {
  blockNumber: bigint | null
  onBack?: () => void
  onViewTransaction?: (txHash: Hash) => void
  onViewAddress?: (address: string) => void
}

export function BlockDetails({ blockNumber, onBack, onViewTransaction, onViewAddress }: BlockDetailsProps) {
  const { block, loading } = useBlock(blockNumber)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString()
  }

  if (!blockNumber) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No block selected
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading block details...
        </CardContent>
      </Card>
    )
  }

  if (!block) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-600 font-medium">Block not found</div>
          <div className="text-sm text-gray-600 mt-2">
            Block #{blockNumber.toString()} could not be loaded
          </div>
          {onBack && (
            <Button onClick={onBack} className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blocks
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Block Header */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <CardTitle>Block #{block.number.toString()}</CardTitle>
              <CardDescription>
                Block details and transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Block Information Grid */}
            <div className="grid grid-cols-[200px_1fr] gap-y-3 text-sm">
              <div className="text-gray-500">Block Number:</div>
              <div className="font-medium">{block.number.toString()}</div>

              <div className="text-gray-500">Block Hash:</div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {block.hash}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(block.hash)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Parent Hash:</div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {block.parentHash}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(block.parentHash)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Timestamp:</div>
              <div>{formatTimestamp(block.timestamp)}</div>

              <div className="text-gray-500">Validator:</div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline"
                  onClick={() => onViewAddress?.(block.miner)}
                >
                  {block.miner}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(block.miner)}
                  className="h-6 w-6"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-500">Transaction Count:</div>
              <div className="font-medium">{block.transactionCount}</div>

              <div className="text-gray-500">Size:</div>
              <div>{(Number(block.size) / 1024).toFixed(2)} KB ({block.size.toString()} bytes)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {block.transactionCount > 0 && (
        <Card className="bg-white shadow-md">
          <CardHeader className="border-b">
            <CardTitle>Transactions ({block.transactionCount})</CardTitle>
            <CardDescription>
              All transactions in this block
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tx Hash
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {block.transactions.map((txHash, index) => (
                    <tr
                      key={txHash}
                      onClick={() => onViewTransaction?.(txHash)}
                      className={`${onViewTransaction ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {onViewTransaction && (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-mono text-blue-600">
                            {txHash}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(txHash)
                            }}
                            className="h-6 w-6"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {block.transactionCount === 0 && (
        <Card className="bg-white shadow-md">
          <CardContent className="py-8 text-center text-gray-500">
            No transactions in this block
          </CardContent>
        </Card>
      )}
    </div>
  )
}
