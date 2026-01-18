import type { Block, Log, Hash, Address } from 'viem'

// Re-export viem types for convenience
export type { Block, Log, Hash, Address }

// Re-export shared blockchain types
export type {
  TransactionInfo,
  EventInfo,
  IndexedBlock,
  IndexedTransaction,
  IndexedEvent,
  DecodedEvent,
  ApiResponse,
} from '@packages/shared-types'
