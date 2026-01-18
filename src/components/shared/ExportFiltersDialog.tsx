import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useOrderExport, type ExportFilters } from '@/hooks/useOrderExport'
import { Download, X, Loader2 } from 'lucide-react'
import type { Address } from 'viem'

interface ExportFiltersDialogProps {
  proxyAddress: Address
  orderCount: number
  onClose: () => void
}

const ORDER_STATES = [
  { value: 0, label: 'Created' },
  { value: 1, label: 'PickedUp' },
  { value: 2, label: 'InTransit' },
  { value: 3, label: 'AtFacility' },
  { value: 4, label: 'Delivered' },
]

export function ExportFiltersDialog({
  proxyAddress,
  orderCount,
  onClose,
}: ExportFiltersDialogProps) {
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedStates, setSelectedStates] = useState<number[]>([])
  const [allStates, setAllStates] = useState(true)
  const [receiver, setReceiver] = useState<string>('')

  const { exportOrders, isExporting, progress, error, cancel } = useOrderExport({
    proxyAddress,
  })

  const handleStateToggle = (state: number) => {
    if (allStates) {
      // Switching from "all" to specific selection
      setAllStates(false)
      setSelectedStates([state])
    } else {
      setSelectedStates((prev) =>
        prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
      )
    }
  }

  const handleAllStatesToggle = () => {
    setAllStates(true)
    setSelectedStates([])
  }

  const handleExport = async () => {
    const filters: ExportFilters = {}

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom)
    }
    if (dateTo) {
      // Set to end of day
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filters.dateTo = toDate
    }
    if (!allStates && selectedStates.length > 0) {
      filters.states = selectedStates
    }
    if (receiver.trim()) {
      filters.receiver = receiver.trim() as Address
    }

    await exportOrders(filters)

    // Close dialog on success (no error)
    if (!error) {
      onClose()
    }
  }

  const handleCancel = () => {
    if (isExporting) {
      cancel()
    }
    onClose()
  }

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Export Orders</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Order count info */}
          <div className="text-sm text-gray-600">
            Exporting from proxy with <span className="font-semibold">{orderCount}</span> orders
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Date Range (optional)
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={isExporting}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={isExporting}
                />
              </div>
            </div>
          </div>

          {/* Order State Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Order State
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allStates}
                  onChange={handleAllStatesToggle}
                  className="rounded"
                  disabled={isExporting}
                />
                <span className="text-sm">All States</span>
              </label>
              <div className="grid grid-cols-2 gap-2 pl-6">
                {ORDER_STATES.map((state) => (
                  <label
                    key={state.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={allStates || selectedStates.includes(state.value)}
                      onChange={() => handleStateToggle(state.value)}
                      className="rounded"
                      disabled={isExporting}
                    />
                    <span className="text-sm">{state.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Receiver Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Receiver Address (optional)
            </label>
            <input
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="0x... or leave empty for all"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
              disabled={isExporting}
            />
          </div>

          {/* Progress Bar */}
          {isExporting && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {progress.phase === 'fetching' && 'Fetching orders...'}
                  {progress.phase === 'processing' && 'Processing...'}
                  {progress.phase === 'downloading' && 'Downloading...'}
                </span>
                <span className="font-medium">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isExporting && progress?.phase === 'downloading'}
            >
              {isExporting ? 'Cancel' : 'Close'}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || orderCount === 0}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
