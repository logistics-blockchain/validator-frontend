import React, { useState, useEffect } from 'react'
import { BlockExplorer } from '@/components/explorer/BlockExplorer'
import { BlockDetails } from '@/components/explorer/BlockDetails'
import { TransactionDetails } from '@/components/explorer/TransactionDetails'
import { AccountPage } from '@/components/account/AccountPage'
import { ContractPage } from '@/components/contracts/ContractPage'
import { useContractStore } from '@/store/contractStore'
import type { Hash, Address } from 'viem'
import type { ExplorerInitialView } from '@/App'

type View =
  | { type: 'list' }
  | { type: 'block'; blockNumber: bigint }
  | { type: 'transaction'; txHash: Hash }
  | { type: 'account'; address: Address }
  | { type: 'contract'; address: Address }

interface ExplorerViewProps {
  initialView?: ExplorerInitialView
}

export function ExplorerView({ initialView }: ExplorerViewProps) {
  const [view, setView] = useState<View>({ type: 'list' })
  const { contracts } = useContractStore()

  useEffect(() => {
    if (initialView?.address) {
      const isKnownContract = contracts.some(
        (c) => c.address.toLowerCase() === initialView.address!.toLowerCase()
      )
      if (isKnownContract) {
        setView({ type: 'contract', address: initialView.address })
      } else {
        setView({ type: 'account', address: initialView.address })
      }
    } else if (initialView?.blockNumber) {
      setView({ type: 'block', blockNumber: initialView.blockNumber })
    } else if (initialView?.txHash) {
      setView({ type: 'transaction', txHash: initialView.txHash })
    } else {
      setView({ type: 'list' })
    }
  }, [initialView, contracts])

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
