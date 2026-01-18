// Re-export all bridge types from shared package
export type {
  BridgePayment,
  BesuOrderCreatedEvent,
  BasePaymentEvent,
  CrossChainTransaction,
  BridgeStats,
  ChainStatus,
} from '@packages/shared-types'

export { BRIDGE_CONFIG } from '@packages/shared-types'
