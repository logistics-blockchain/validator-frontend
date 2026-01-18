/**
 * CSV Export Utilities
 * RFC 4180 compliant CSV generation with proper escaping
 */

import type { Address } from 'viem'

export interface ColumnDef<T> {
  header: string
  accessor: keyof T | ((row: T) => string | number | null | undefined)
  format?: (value: unknown) => string
}

/**
 * Escape a value for CSV (RFC 4180 compliant)
 * - Wrap in quotes if contains comma, quote, or newline
 * - Double any existing quotes
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  // Check if escaping is needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Double quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T>(data: T[], columns: ColumnDef<T>[]): string {
  // Header row
  const headers = columns.map((col) => escapeCSV(col.header))
  const headerRow = headers.join(',')

  // Data rows
  const dataRows = data.map((row) => {
    const values = columns.map((col) => {
      let value: unknown

      if (typeof col.accessor === 'function') {
        value = col.accessor(row)
      } else {
        value = row[col.accessor]
      }

      // Apply format function if provided
      if (col.format) {
        value = col.format(value)
      }

      // Handle bigint
      if (typeof value === 'bigint') {
        value = value.toString()
      }

      return escapeCSV(value as string | number | null | undefined)
    })

    return values.join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Generate timestamped filename
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 10) // YYYY-MM-DD
  return `${prefix}_${timestamp}.${extension}`
}

/**
 * Trigger browser download of content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  downloadFile(content, filename, 'text/csv;charset=utf-8;')
}

/**
 * Format address for CSV export (full address, not truncated)
 */
export function formatAddressForExport(address: Address | string): string {
  return address.toLowerCase()
}

/**
 * Format unix timestamp to ISO 8601 string
 */
export function formatTimestampForExport(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString()
}

/**
 * Format unix timestamp to human readable date
 */
export function formatDateForExport(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleString()
}

/**
 * Calculate duration between two timestamps in hours
 */
export function calculateDurationHours(
  start: number | null | undefined,
  end: number | null | undefined
): number | null {
  if (!start || !end) return null
  const durationSeconds = end - start
  return Math.round((durationSeconds / 3600) * 10) / 10 // Round to 1 decimal
}

/**
 * Order state number to string mapping
 */
export function orderStateToString(state: number): string {
  const states = ['Created', 'PickedUp', 'InTransit', 'AtFacility', 'Delivered']
  return states[state] || 'Unknown'
}
