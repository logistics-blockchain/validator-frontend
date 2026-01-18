import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Copy } from 'lucide-react'
import type { Address } from 'viem'

interface AddressDisplayProps {
  address: Address
  label?: string
  showFull?: boolean
  showCopy?: boolean
  isContract?: boolean
  contractName?: string
  onClick?: () => void
}

export function AddressDisplay({
  address,
  label,
  showFull = false,
  showCopy = true,
  isContract = false,
  contractName,
  onClick,
}: AddressDisplayProps) {
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(address)
  }

  const formatAddress = (addr: string) => {
    if (showFull) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-gray-500 text-sm">{label}:</span>}

      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-sm ${onClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer underline' : 'text-gray-900'}`}
          onClick={onClick}
          title={address}
        >
          {formatAddress(address)}
        </span>

        {contractName && (
          <Badge variant="outline" className="text-xs">
            {contractName}
          </Badge>
        )}

        {isContract && !contractName && (
          <Badge variant="default" className="text-xs">
            Contract
          </Badge>
        )}

        {showCopy && (
          <Button
            size="icon"
            variant="ghost"
            onClick={copyToClipboard}
            className="h-6 w-6"
            title="Copy address"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
