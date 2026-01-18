import { useCallback } from 'react'
import {
  toCSV,
  generateFilename,
  downloadCSV,
  formatAddressForExport,
  formatTimestampForExport,
  type ColumnDef,
} from '@/utils/exportUtils'
import type { CrossChainTransaction } from '@/types/bridge'

interface ExportableBridgeTransaction {
  orderId: string
  besuProxy: string
  manufacturer: string
  receiver: string
  ipfsHash: string
  besuTxHash: string
  besuBlock: string
  baseAmount: string
  baseRecipient: string
  baseTxHash: string
  baseBlock: string
  status: string
}

const bridgeColumns: ColumnDef<ExportableBridgeTransaction>[] = [
  { header: 'Order ID', accessor: 'orderId' },
  { header: 'Besu Proxy', accessor: 'besuProxy' },
  { header: 'Manufacturer', accessor: 'manufacturer' },
  { header: 'Receiver', accessor: 'receiver' },
  { header: 'IPFS Hash', accessor: 'ipfsHash' },
  { header: 'Besu Tx Hash', accessor: 'besuTxHash' },
  { header: 'Besu Block', accessor: 'besuBlock' },
  { header: 'Payment', accessor: 'baseAmount' },
  { header: 'Base Recipient', accessor: 'baseRecipient' },
  { header: 'Base Tx Hash', accessor: 'baseTxHash' },
  { header: 'Base Block', accessor: 'baseBlock' },
  { header: 'Status', accessor: 'status' },
]

export function useBridgeExport() {
  const exportBridgeTransactions = useCallback((transactions: CrossChainTransaction[]) => {
    if (transactions.length === 0) {
      return
    }

    const exportable: ExportableBridgeTransaction[] = transactions.map((tx) => ({
      orderId: tx.orderId.toString(),
      besuProxy: formatAddressForExport(tx.besuProxyAddress),
      manufacturer: tx.besuEvent ? formatAddressForExport(tx.besuEvent.manufacturer) : '',
      receiver: tx.besuEvent ? formatAddressForExport(tx.besuEvent.receiver) : '',
      ipfsHash: tx.besuEvent?.ipfsHash || '',
      besuTxHash: tx.besuEvent?.txHash || '',
      besuBlock: tx.besuEvent?.blockNumber.toString() || '',
      baseAmount: tx.baseEvent?.amount.toString() || '',
      baseRecipient: tx.baseEvent ? formatAddressForExport(tx.baseEvent.recipient) : '',
      baseTxHash: tx.baseEvent?.txHash || '',
      baseBlock: tx.baseEvent?.blockNumber.toString() || '',
      status: tx.status,
    }))

    const csv = toCSV(exportable, bridgeColumns)
    const filename = generateFilename('bridge_transactions', 'csv')
    downloadCSV(csv, filename)
  }, [])

  return { exportBridgeTransactions }
}
