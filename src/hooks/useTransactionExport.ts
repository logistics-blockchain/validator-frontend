import { useState, useCallback, useRef } from 'react'
import {
  toCSV,
  generateFilename,
  downloadCSV,
  formatAddressForExport,
  formatTimestampForExport,
  type ColumnDef,
} from '@/utils/exportUtils'
import { indexerService } from '@/services/indexerService'
import type { TransactionWithMetadata } from '@/types/explorer'

interface ExportableTransaction {
  txHash: string
  blockNumber: number
  timestamp: string
  timestampISO: string
  from: string
  to: string
  value: string
  status: string
  direction: string
}

export interface TransactionExportProgress {
  current: number
  total: number
  phase: 'fetching_timestamps' | 'processing' | 'downloading'
}

const transactionColumns: ColumnDef<ExportableTransaction>[] = [
  { header: 'Tx Hash', accessor: 'txHash' },
  { header: 'Block', accessor: 'blockNumber' },
  { header: 'Timestamp (Unix)', accessor: 'timestamp' },
  { header: 'Timestamp (ISO)', accessor: 'timestampISO' },
  { header: 'From', accessor: 'from' },
  { header: 'To', accessor: 'to' },
  { header: 'Value (ETH)', accessor: 'value' },
  { header: 'Status', accessor: 'status' },
  { header: 'Direction', accessor: 'direction' },
]

export function useTransactionExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<TransactionExportProgress | null>(null)
  const cancelledRef = useRef(false)

  const cancel = useCallback(() => {
    cancelledRef.current = true
  }, [])

  const exportTransactions = useCallback(async (transactions: TransactionWithMetadata[], address?: string) => {
    if (transactions.length === 0) {
      return
    }

    setIsExporting(true)
    cancelledRef.current = false

    try {
      // Find transactions missing timestamps
      const blockTimestamps = new Map<number, number>()
      const blocksToFetch: number[] = []

      for (const tx of transactions) {
        const blockNum = Number(tx.blockNumber)
        if (tx.timestamp) {
          blockTimestamps.set(blockNum, Number(tx.timestamp))
        } else if (!blocksToFetch.includes(blockNum)) {
          blocksToFetch.push(blockNum)
        }
      }

      // Fetch missing timestamps in parallel batches
      if (blocksToFetch.length > 0) {
        setProgress({ current: 0, total: blocksToFetch.length, phase: 'fetching_timestamps' })

        const BATCH_SIZE = 10
        let completed = 0

        for (let i = 0; i < blocksToFetch.length; i += BATCH_SIZE) {
          if (cancelledRef.current) {
            setIsExporting(false)
            setProgress(null)
            return
          }

          const batch = blocksToFetch.slice(i, i + BATCH_SIZE)
          const results = await Promise.all(
            batch.map(async (blockNum) => {
              try {
                const block = await indexerService.getBlock(blockNum)
                return { blockNum, timestamp: block?.timestamp }
              } catch {
                return { blockNum, timestamp: undefined }
              }
            })
          )

          for (const { blockNum, timestamp } of results) {
            if (timestamp) {
              blockTimestamps.set(blockNum, timestamp)
            }
          }

          completed += batch.length
          setProgress({ current: completed, total: blocksToFetch.length, phase: 'fetching_timestamps' })
        }
      }

      if (cancelledRef.current) {
        setIsExporting(false)
        setProgress(null)
        return
      }

      setProgress({ current: 0, total: transactions.length, phase: 'processing' })

      const exportable: ExportableTransaction[] = transactions.map((tx) => {
        const blockNum = Number(tx.blockNumber)
        const timestamp = tx.timestamp ? Number(tx.timestamp) : blockTimestamps.get(blockNum)

        return {
          txHash: tx.hash,
          blockNumber: blockNum,
          timestamp: timestamp ? timestamp.toString() : '',
          timestampISO: timestamp ? formatTimestampForExport(timestamp) : '',
          from: formatAddressForExport(tx.from),
          to: tx.to ? formatAddressForExport(tx.to) : 'Contract Creation',
          value: (Number(tx.value) / 1e18).toString(),
          status: tx.status || 'unknown',
          direction: tx.direction || 'unknown',
        }
      })

      setProgress({ current: transactions.length, total: transactions.length, phase: 'downloading' })

      const csv = toCSV(exportable, transactionColumns)
      const prefix = address ? `transactions_${address.slice(2, 10)}` : 'transactions'
      const filename = generateFilename(prefix, 'csv')
      downloadCSV(csv, filename)

      setProgress(null)
    } finally {
      setIsExporting(false)
    }
  }, [])

  return { exportTransactions, isExporting, progress, cancel }
}
