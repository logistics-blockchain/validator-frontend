import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { keccak256, toHex, decodeAbiParameters } from 'viem'
import { indexerService, type IndexedEvent, type BridgePayment } from '@/services/indexerService'
import type {
  BesuOrderCreatedEvent,
  BasePaymentEvent,
  CrossChainTransaction,
  BridgeStats,
  ChainStatus,
} from '@/types/bridge'
import { BRIDGE_CONFIG } from '@/types/bridge'

// OrderCreated event signature: OrderCreated(uint256 indexed tokenId, address indexed manufacturer, address indexed receiver, string ipfsHash)
const ORDER_CREATED_TOPIC = keccak256(
  toHex('OrderCreated(uint256,address,address,string)')
)

// Decode OrderCreated event from indexed event
function decodeOrderCreatedEvent(event: IndexedEvent): BesuOrderCreatedEvent | null {
  try {
    // topic1 = tokenId (indexed)
    // topic2 = manufacturer (indexed)
    // topic3 = receiver (indexed)
    // data = ipfsHash (non-indexed string)
    const tokenId = event.topic1 ? BigInt(event.topic1) : 0n
    const manufacturer = event.topic2
      ? (`0x${event.topic2.slice(-40)}` as `0x${string}`)
      : ('0x0' as `0x${string}`)
    const receiver = event.topic3
      ? (`0x${event.topic3.slice(-40)}` as `0x${string}`)
      : ('0x0' as `0x${string}`)

    // Decode ipfsHash from data (it's an ABI-encoded string)
    let ipfsHash = ''
    if (event.data && event.data !== '0x') {
      try {
        const decoded = decodeAbiParameters(
          [{ type: 'string', name: 'ipfsHash' }],
          event.data as `0x${string}`
        )
        ipfsHash = decoded[0]
      } catch {
        ipfsHash = ''
      }
    }

    return {
      orderId: tokenId,
      proxyAddress: event.address,
      manufacturer,
      receiver,
      ipfsHash,
      txHash: event.txHash,
      blockNumber: BigInt(event.blockNumber),
      timestamp: null, // We'll fetch this separately if needed
    }
  } catch (err) {
    console.warn('[Bridge] Failed to decode OrderCreated event:', err)
    return null
  }
}

export function useBridgeEvents() {
  const [besuEvents, setBesuEvents] = useState<BesuOrderCreatedEvent[]>([])
  const [baseEvents, setBaseEvents] = useState<BasePaymentEvent[]>([])
  const [loading, setLoading] = useState({ besu: false, base: false })
  const [errors, setErrors] = useState<{ besu: string | null; base: string | null }>({
    besu: null,
    base: null,
  })
  const [chainStatus, setChainStatus] = useState<{
    besu: ChainStatus
    base: ChainStatus
  }>({
    besu: {
      chainId: BRIDGE_CONFIG.besu.chainId,
      name: BRIDGE_CONFIG.besu.name,
      connected: false,
      latestBlock: null,
      error: null,
    },
    base: {
      chainId: BRIDGE_CONFIG.baseSepolia.chainId,
      name: BRIDGE_CONFIG.baseSepolia.name,
      connected: true,
      latestBlock: null,
      error: null,
    },
  })

  const initialLoadDone = useRef(false)

  // Fetch OrderCreated events from the indexer
  const fetchBesuEvents = useCallback(async () => {
    setLoading((prev) => ({ ...prev, besu: true }))
    setErrors((prev) => ({ ...prev, besu: null }))

    try {
      // Fetch OrderCreated events by topic0 from indexer
      // The indexer has all events stored in SQLite - this is instant
      const indexedEvents = await indexerService.getEventsByTopic(
        ORDER_CREATED_TOPIC,
        1000, // Get up to 1000 events
        0
      )

      setChainStatus((prev) => ({
        ...prev,
        besu: { ...prev.besu, connected: true, error: null },
      }))

      // Decode events
      const decodedEvents: BesuOrderCreatedEvent[] = []
      for (const event of indexedEvents) {
        const decoded = decodeOrderCreatedEvent(event)
        if (decoded) {
          decodedEvents.push(decoded)
        }
      }

      // Fetch timestamps for events (limit to 20 most recent)
      const uniqueBlocks = [...new Set(decodedEvents.map((e) => Number(e.blockNumber)))]
        .sort((a, b) => b - a)
        .slice(0, 20)

      for (const blockNum of uniqueBlocks) {
        try {
          const block = await indexerService.getBlock(blockNum)
          if (block) {
            // Update timestamps for events in this block
            for (const event of decodedEvents) {
              if (Number(event.blockNumber) === blockNum) {
                event.timestamp = BigInt(block.timestamp)
              }
            }
          }
        } catch {
          // Ignore timestamp fetch errors
        }
      }

      setBesuEvents(decodedEvents)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrors((prev) => ({ ...prev, besu: message }))
      setChainStatus((prev) => ({
        ...prev,
        besu: { ...prev.besu, connected: false, error: message },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, besu: false }))
    }
  }, [])

  // Fetch bridge payments from Base chain indexer
  const fetchBasePayments = useCallback(async () => {
    setLoading((prev) => ({ ...prev, base: true }))
    setErrors((prev) => ({ ...prev, base: null }))

    try {
      const { payments } = await indexerService.getBridgePayments(1000, 0)

      // Convert BridgePayment responses to BasePaymentEvent format
      const basePaymentEvents: BasePaymentEvent[] = payments.map((payment) => ({
        besuProxy: payment.besuProxy,
        orderId: BigInt(payment.orderId),
        amount: BigInt(payment.amount),
        recipient: payment.recipient,
        txHash: payment.txHash,
        blockNumber: BigInt(payment.blockNumber),
      }))

      setBaseEvents(basePaymentEvents)
      setChainStatus((prev) => ({
        ...prev,
        base: { ...prev.base, connected: true, error: null },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrors((prev) => ({ ...prev, base: message }))
      setChainStatus((prev) => ({
        ...prev,
        base: { ...prev.base, connected: false, error: message },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, base: false }))
    }
  }, [])

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([fetchBesuEvents(), fetchBasePayments()])
  }, [fetchBesuEvents, fetchBasePayments])

  // Initial fetch and polling
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      refresh()
    }

    // Poll every 30 seconds for new events
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  // Create transactions from Besu events and match with Base payments
  const matchedTransactions = useMemo(() => {
    // Create a map of base events by composite key for quick lookup
    const baseEventMap = new Map<string, BasePaymentEvent>()
    for (const baseEvent of baseEvents) {
      const key = `${baseEvent.besuProxy.toLowerCase()}-${baseEvent.orderId}`
      baseEventMap.set(key, baseEvent)
    }

    // Map besu events to transactions and match with base payments
    const transactions: CrossChainTransaction[] = besuEvents.map((event) => {
      const compositeKey = `${event.proxyAddress.toLowerCase()}-${event.orderId}`
      const baseEvent = baseEventMap.get(compositeKey) || null

      return {
        compositeKey,
        besuProxyAddress: event.proxyAddress,
        orderId: event.orderId,
        besuEvent: event,
        baseEvent,
        status: baseEvent ? ('completed' as const) : ('pending' as const),
      }
    })

    // Sort by block number descending (newest first)
    return transactions.sort((a, b) => {
      const blockA = a.besuEvent?.blockNumber ?? 0n
      const blockB = b.besuEvent?.blockNumber ?? 0n
      return Number(blockB - blockA)
    })
  }, [besuEvents, baseEvents])

  // Calculate stats
  const stats: BridgeStats = useMemo(() => {
    const completedCount = matchedTransactions.filter((tx) => tx.status === 'completed').length
    const pendingCount = matchedTransactions.filter((tx) => tx.status === 'pending').length

    return {
      totalOrders: matchedTransactions.length,
      completedBridges: completedCount,
      pendingBridges: pendingCount,
      lastActivity: matchedTransactions.length > 0 ? new Date() : null,
    }
  }, [matchedTransactions])

  return {
    besuEvents,
    baseEvents,
    matchedTransactions,
    loading,
    errors,
    chainStatus,
    stats,
    refresh,
  }
}
