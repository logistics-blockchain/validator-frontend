import { decodeEventLog, type Abi } from 'viem'
import { insertDecodedEvent, getContract, getEventsByAddress } from '../db/queries.js'
import type { IndexedEvent, DecodedEvent } from '../types.js'

export async function decodeEventIfPossible(
  eventId: number,
  event: IndexedEvent,
  abiJson: string
): Promise<boolean> {
  try {
    const abi = JSON.parse(abiJson) as Abi

    // Build topics array
    const topics: `0x${string}`[] = []
    if (event.topic0) topics.push(event.topic0 as `0x${string}`)
    if (event.topic1) topics.push(event.topic1 as `0x${string}`)
    if (event.topic2) topics.push(event.topic2 as `0x${string}`)
    if (event.topic3) topics.push(event.topic3 as `0x${string}`)

    const decoded = decodeEventLog({
      abi,
      data: event.data as `0x${string}`,
      topics: topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
    })

    if (!decoded.eventName) {
      return false
    }

    const decodedEvent: DecodedEvent = {
      eventId,
      eventName: decoded.eventName,
      args: JSON.stringify(decoded.args, bigintReplacer),
      decodedAt: Date.now(),
    }

    insertDecodedEvent(decodedEvent)
    return true
  } catch (error) {
    // Event doesn't match ABI or decoding failed
    return false
  }
}

export async function decodeAllEventsForContract(address: string): Promise<number> {
  const contract = getContract(address)
  if (!contract?.abi) {
    throw new Error(`No ABI found for contract ${address}`)
  }

  let decoded = 0
  let offset = 0
  const batchSize = 100

  while (true) {
    const events = getEventsByAddress(address, batchSize, offset)
    if (events.length === 0) break

    for (const event of events) {
      if (event.id) {
        const success = await decodeEventIfPossible(event.id, event, contract.abi)
        if (success) decoded++
      }
    }

    offset += batchSize
  }

  return decoded
}

// Helper to serialize BigInt values in JSON
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}
