import { useState, useCallback, useRef } from 'react'
import { publicClient } from '@/lib/viem'
import { useContractStore } from '@/store/contractStore'
import {
  toCSV,
  generateFilename,
  downloadCSV,
  formatAddressForExport,
  formatTimestampForExport,
  calculateDurationHours,
  orderStateToString,
  type ColumnDef,
} from '@/utils/exportUtils'
import type { Address } from 'viem'
import type { Order } from '@/types/contracts'

export interface ExportFilters {
  dateFrom?: Date
  dateTo?: Date
  states?: number[]
  receiver?: Address
}

export interface ExportProgress {
  current: number
  total: number
  phase: 'fetching' | 'processing' | 'downloading'
}

interface UseOrderExportOptions {
  proxyAddress: Address
}

interface UseOrderExportReturn {
  exportOrders: (filters?: ExportFilters) => Promise<void>
  isExporting: boolean
  progress: ExportProgress | null
  error: string | null
  cancel: () => void
}

interface ExportableOrder {
  tokenId: string
  manufacturer: string
  receiver: string
  state: number
  stateName: string
  createdAt: number
  createdAtISO: string
  ipfsHash: string
}

// Order columns for CSV export
const orderColumns: ColumnDef<ExportableOrder>[] = [
  { header: 'Token ID', accessor: 'tokenId' },
  { header: 'Manufacturer', accessor: 'manufacturer' },
  { header: 'Receiver', accessor: 'receiver' },
  { header: 'State', accessor: 'state' },
  { header: 'State Name', accessor: 'stateName' },
  { header: 'Created At (Unix)', accessor: 'createdAt' },
  { header: 'Created At (ISO)', accessor: 'createdAtISO' },
  { header: 'IPFS Hash', accessor: 'ipfsHash' },
]

export function useOrderExport({
  proxyAddress,
}: UseOrderExportOptions): UseOrderExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const { contracts } = useContractStore()

  const cancel = useCallback(() => {
    cancelledRef.current = true
  }, [])

  const exportOrders = useCallback(
    async (filters?: ExportFilters) => {
      setIsExporting(true)
      setError(null)
      setProgress({ current: 0, total: 0, phase: 'fetching' })
      cancelledRef.current = false

      try {
        // Find the contract ABI for this proxy
        const contract = contracts.find((c) => c.address === proxyAddress)
        if (!contract) {
          throw new Error('Contract not found. Please ensure the proxy is loaded.')
        }

        // Get total supply
        const totalSupply = (await publicClient.readContract({
          address: proxyAddress,
          abi: contract.abi,
          functionName: 'getTotalSupply',
        })) as bigint

        const total = Number(totalSupply)

        if (total === 0) {
          throw new Error('No orders to export')
        }

        setProgress({ current: 0, total, phase: 'fetching' })

        // Fetch orders in batches
        const batchSize = 20
        const orders: Order[] = []

        for (let i = 1; i <= total; i += batchSize) {
          if (cancelledRef.current) {
            throw new Error('Export cancelled')
          }

          const batchEnd = Math.min(i + batchSize - 1, total)
          const batchPromises = []

          for (let j = i; j <= batchEnd; j++) {
            batchPromises.push(
              publicClient.readContract({
                address: proxyAddress,
                abi: contract.abi,
                functionName: 'getOrder',
                args: [BigInt(j)],
              })
            )
          }

          const batchResults = (await Promise.all(batchPromises)) as Order[]
          orders.push(...batchResults)

          setProgress({ current: orders.length, total, phase: 'fetching' })

          // Small delay between batches to avoid rate limiting
          if (batchEnd < total) {
            await new Promise((r) => setTimeout(r, 50))
          }
        }

        if (cancelledRef.current) {
          throw new Error('Export cancelled')
        }

        setProgress({ current: total, total, phase: 'processing' })

        // Apply filters
        let filteredOrders = orders

        if (filters?.dateFrom) {
          const fromTimestamp = Math.floor(filters.dateFrom.getTime() / 1000)
          filteredOrders = filteredOrders.filter(
            (order) => Number(order.createdAt) >= fromTimestamp
          )
        }

        if (filters?.dateTo) {
          const toTimestamp = Math.floor(filters.dateTo.getTime() / 1000)
          filteredOrders = filteredOrders.filter(
            (order) => Number(order.createdAt) <= toTimestamp
          )
        }

        if (filters?.states && filters.states.length > 0) {
          filteredOrders = filteredOrders.filter((order) =>
            filters.states!.includes(order.state)
          )
        }

        if (filters?.receiver) {
          const receiverLower = filters.receiver.toLowerCase()
          filteredOrders = filteredOrders.filter(
            (order) => order.receiver.toLowerCase() === receiverLower
          )
        }

        if (filteredOrders.length === 0) {
          throw new Error('No orders match the selected filters')
        }

        // Transform to exportable format
        const exportableOrders: ExportableOrder[] = filteredOrders.map((order) => ({
          tokenId: order.tokenId.toString(),
          manufacturer: formatAddressForExport(order.manufacturer),
          receiver: formatAddressForExport(order.receiver),
          state: order.state,
          stateName: orderStateToString(order.state),
          createdAt: Number(order.createdAt),
          createdAtISO: formatTimestampForExport(Number(order.createdAt)),
          ipfsHash: order.ipfsHash,
        }))

        // Generate CSV
        const csv = toCSV(exportableOrders, orderColumns)

        setProgress({ current: total, total, phase: 'downloading' })

        // Download
        const filename = generateFilename(
          `orders_${proxyAddress.slice(2, 10)}`,
          'csv'
        )
        downloadCSV(csv, filename)

        setProgress(null)
      } catch (err: any) {
        console.error('Export error:', err)
        setError(err.message || 'Failed to export orders')
      } finally {
        setIsExporting(false)
      }
    },
    [proxyAddress, contracts]
  )

  return {
    exportOrders,
    isExporting,
    progress,
    error,
    cancel,
  }
}
