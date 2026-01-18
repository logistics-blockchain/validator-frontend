import { useCallback } from 'react'
import { decodeEventLog } from 'viem'
import {
  toCSV,
  generateFilename,
  downloadCSV,
  formatAddressForExport,
  formatTimestampForExport,
  type ColumnDef,
} from '@/utils/exportUtils'
import type { EventWithContext } from './useAddressEvents'
import type { Abi, Hash } from 'viem'

interface ExportableEvent {
  blockNumber: string
  timestamp: string
  timestampISO: string
  txHash: string
  logIndex: string
  eventName: string
  address: string
  topic0: string
  topic1: string
  topic2: string
  topic3: string
  data: string
}

const eventColumns: ColumnDef<ExportableEvent>[] = [
  { header: 'Block', accessor: 'blockNumber' },
  { header: 'Timestamp (Unix)', accessor: 'timestamp' },
  { header: 'Timestamp (ISO)', accessor: 'timestampISO' },
  { header: 'Tx Hash', accessor: 'txHash' },
  { header: 'Log Index', accessor: 'logIndex' },
  { header: 'Event Name', accessor: 'eventName' },
  { header: 'Address', accessor: 'address' },
  { header: 'Topic 0', accessor: 'topic0' },
  { header: 'Topic 1', accessor: 'topic1' },
  { header: 'Topic 2', accessor: 'topic2' },
  { header: 'Topic 3', accessor: 'topic3' },
  { header: 'Data', accessor: 'data' },
]

export function useEventExport() {
  const exportEvents = useCallback((events: EventWithContext[], address?: string, abi?: Abi) => {
    if (events.length === 0) {
      return
    }

    const decodeEventName = (event: EventWithContext): string => {
      if (!abi) return ''
      try {
        const decoded = decodeEventLog({
          abi,
          data: event.data as Hash,
          topics: event.topics as [Hash, ...Hash[]],
        })
        return decoded.eventName
      } catch {
        return ''
      }
    }

    const exportable: ExportableEvent[] = events.map((event) => ({
      blockNumber: event.blockNumber.toString(),
      timestamp: event.timestamp ? event.timestamp.toString() : '',
      timestampISO: event.timestamp ? formatTimestampForExport(Number(event.timestamp)) : '',
      txHash: event.transactionHash,
      logIndex: event.logIndex.toString(),
      eventName: decodeEventName(event),
      address: formatAddressForExport(event.address),
      topic0: event.topics[0] || '',
      topic1: event.topics[1] || '',
      topic2: event.topics[2] || '',
      topic3: event.topics[3] || '',
      data: event.data,
    }))

    const csv = toCSV(exportable, eventColumns)
    const prefix = address ? `events_${address.slice(2, 10)}` : 'events'
    const filename = generateFilename(prefix, 'csv')
    downloadCSV(csv, filename)
  }, [])

  return { exportEvents }
}
