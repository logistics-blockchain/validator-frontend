import React, { useState } from 'react'
import { useBlockHistory } from '@/hooks/useBlockHistory'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatAddress } from '@/lib/utils'
import { ChevronRight, RefreshCw, Search } from 'lucide-react'
import type { Hash, Address } from 'viem'

interface BlockExplorerProps {
  onViewBlock?: (blockNumber: bigint) => void
  onViewTransaction?: (txHash: Hash) => void
  onViewAddress?: (address: Address) => void
}

export function BlockExplorer({ onViewBlock, onViewTransaction, onViewAddress }: BlockExplorerProps) {
  const [blockCount, setBlockCount] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const { blocks, loading, refresh } = useBlockHistory(blockCount)

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString()
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - Number(timestamp)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const handleBlockClick = (blockNumber: bigint) => {
    if (onViewBlock) {
      onViewBlock(blockNumber)
    }
  }

  const handleSearch = () => {
    setSearchError(null)
    const query = searchQuery.trim()

    if (!query) {
      setSearchError('Please enter a search query')
      return
    }

    try {
      // Check if it's a block number (numeric)
      if (/^\d+$/.test(query)) {
        const blockNumber = BigInt(query)
        if (onViewBlock) {
          onViewBlock(blockNumber)
        }
        return
      }

      // Check if it's a transaction hash (0x followed by 64 hex chars)
      if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
        if (!onViewTransaction) {
          setSearchError('Transaction view not configured')
          return
        }
        onViewTransaction(query as Hash)
        return
      }

      // Check if it's an address (0x followed by 40 hex chars)
      if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
        if (!onViewAddress) {
          setSearchError('Address view not configured')
          return
        }
        onViewAddress(query as Address)
        return
      }

      setSearchError('Invalid input. Enter a block number, transaction hash (0x...), or address (0x...)')
    } catch (error) {
      console.error('Search error:', error)
      setSearchError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by block number, transaction hash (0x...), or address (0x...)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleSearch}
                className="gap-2"
                size="default"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
            {searchError && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                {searchError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block List */}
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Blocks</CardTitle>
              <CardDescription>
                Latest {blockCount} blocks from the blockchain
              </CardDescription>
            </div>
            <Button
              onClick={refresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && blocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading blocks...</div>
          ) : (
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
                      Txns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hash
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blocks.map((block) => (
                    <tr
                      key={block.hash}
                      onClick={() => handleBlockClick(block.number)}
                      className="hover:bg-blue-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-blue-600">
                            {block.number.toString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimeAgo(block.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {block.transactionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatAddress(block.miner)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(Number(block.size) / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatAddress(block.hash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && blocks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No blocks found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block Count Selector */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Show blocks:</label>
          <select
            value={blockCount}
            onChange={(e) => setBlockCount(Number(e.target.value))}
            className="p-2 border rounded-md text-sm bg-white border-gray-300"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}
