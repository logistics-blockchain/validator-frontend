export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/i.test(addr)
}

export function isValidHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/i.test(hash)
}

export function isValidBlockNumber(num: any): boolean {
  const n = parseInt(num, 10)
  return !isNaN(n) && n >= 0
}

export function sanitizeLimit(limit: any, defaultVal = 50, maxVal = 1000): number {
  const num = parseInt(limit, 10)
  if (isNaN(num)) return defaultVal
  return Math.min(Math.max(num, 1), maxVal)
}

export function sanitizeOffset(offset: any): number {
  const num = parseInt(offset, 10)
  if (isNaN(num)) return 0
  return Math.max(num, 0)
}

export function sanitizeDirection(dir: any): 'in' | 'out' | 'all' {
  if (dir === 'in' || dir === 'out') return dir
  return 'all'
}
