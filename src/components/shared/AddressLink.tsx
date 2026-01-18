import React from 'react'
import type { Address } from 'viem'
import { useNavigation } from '@/App'
import { formatAddress } from '@/lib/utils'

interface AddressLinkProps {
  address: Address
  showFull?: boolean
  className?: string
}

export function AddressLink({ address, showFull = false, className = '' }: AddressLinkProps) {
  const { navigateToExplorer } = useNavigation()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    navigateToExplorer({ address })
  }

  const displayAddress = showFull ? address : formatAddress(address)

  return (
    <a
      href="#"
      onClick={handleClick}
      className={`font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ${className}`}
      title={`View ${address} in explorer`}
    >
      {displayAddress}
    </a>
  )
}
