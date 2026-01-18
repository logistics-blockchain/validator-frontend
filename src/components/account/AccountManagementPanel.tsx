import { useState } from 'react'
import { useAccountStore } from '@/store/accountStore'
import { useBlockchainStore } from '@/store/blockchainStore'
import { getActiveAccounts, getActiveChain } from '@/lib/viem'
import { formatAddress } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Copy, Eye, EyeOff } from 'lucide-react'

export function AccountManagementPanel() {
  const { selectedAccountIndex, setSelectedAccount } = useAccountStore()
  const { isConnected } = useBlockchainStore()
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const accounts = getActiveAccounts()
  const chain = getActiveChain()
  const selectedAccount = accounts[selectedAccountIndex]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Account Management</CardTitle>
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Account</label>
          <select
            value={selectedAccountIndex}
            onChange={(e) => setSelectedAccount(parseInt(e.target.value))}
            className="w-full p-2 border rounded-md bg-white"
          >
            {accounts.map((account, index) => (
              <option key={account.address} value={index}>
                Account #{index}: {formatAddress(account.address)}
              </option>
            ))}
          </select>
        </div>

        {/* Network Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Network</div>
            <div className="font-medium">{chain.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Chain ID</div>
            <div className="font-medium">{chain.id}</div>
          </div>
        </div>

        {/* Address Display */}
        <div>
          <div className="text-sm text-gray-600 mb-1">Address</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-gray-100 rounded text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {selectedAccount.address}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(selectedAccount.address)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Private Key Display */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-600">Private Key</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {showPrivateKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-gray-100 rounded text-xs break-all">
                {selectedAccount.privateKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(selectedAccount.privateKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-2 bg-gray-100 rounded text-center text-sm text-gray-500">
              Click the eye icon to reveal
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
