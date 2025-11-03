import React, { useState } from 'react'
import { BlockExplorer } from './BlockExplorer'
import { BlockDetails } from './BlockDetails'
import { TransactionDetails } from './TransactionDetails'
import { AccountPage } from './AccountPage'
import { ContractPage } from './ContractPage'
import { useContractStore } from '@/store/contractStore'
import type { Hash, Address } from 'viem'

type View =
  | { type: 'list' }
  | { type: 'block'; blockNumber: bigint }
  | { type: 'transaction'; txHash: Hash }
  | { type: 'account'; address: Address }
  | { type: 'contract'; address: Address }

export function ExplorerView() {
  const [view, setView] = useState<View>({ type: 'list' })
  const { contracts } = useContractStore()

  const handleViewAddress = (address: string) => {
    const addr = address as Address

    // Check if this is a known contract
    const isKnownContract = contracts.some(
      (c) => c.address.toLowerCase() === addr.toLowerCase()
    )

    if (isKnownContract) {
      setView({ type: 'contract', address: addr })
    } else {
      setView({ type: 'account', address: addr })
    }
  }

  if (view.type === 'block') {
    return (
      <BlockDetails
        blockNumber={view.blockNumber}
        onBack={() => setView({ type: 'list' })}
        onViewTransaction={(txHash) => setView({ type: 'transaction', txHash })}
        onViewAddress={handleViewAddress}
      />
    )
  }

  if (view.type === 'transaction') {
    return (
      <TransactionDetails
        txHash={view.txHash}
        onBack={() => setView({ type: 'list' })}
        onViewAddress={handleViewAddress}
      />
    )
  }

  if (view.type === 'account') {
    return (
      <AccountPage
        address={view.address}
        onBack={() => setView({ type: 'list' })}
        onViewTransaction={(txHash) => setView({ type: 'transaction', txHash })}
        onViewAddress={handleViewAddress}
        onViewContract={(address) => setView({ type: 'contract', address })}
      />
    )
  }

  if (view.type === 'contract') {
    return (
      <ContractPage
        address={view.address}
        onBack={() => setView({ type: 'list' })}
        onViewTransaction={(txHash) => setView({ type: 'transaction', txHash })}
        onViewAddress={handleViewAddress}
        onViewAccount={(address) => setView({ type: 'account', address })}
      />
    )
  }

  return (
    <BlockExplorer
      onViewBlock={(blockNumber) => setView({ type: 'block', blockNumber })}
      onViewTransaction={(txHash) => setView({ type: 'transaction', txHash })}
      onViewAddress={handleViewAddress}
    />
  )
}
