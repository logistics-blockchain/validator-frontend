import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { X, Download, Database, Code, Hash, Globe, Link } from 'lucide-react'
import { keccak256, toHex } from 'viem'
import { useBlockchainStore } from '@/store/blockchainStore'

interface GenesisConfig {
  config: {
    chainId: number
    qbft?: {
      blockperiodseconds: number
      epochlength: number
      validatorcontractaddress?: string
    }
  }
  extraData?: string
  alloc?: Record<string, any>
}

interface NetworkInfoDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function NetworkInfoDialog({ isOpen, onClose }: NetworkInfoDialogProps) {
  const [genesis, setGenesis] = useState<GenesisConfig | null>(null)
  const [genesisHash, setGenesisHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { availableNetworks, activeNetworkId } = useBlockchainStore()

  useEffect(() => {
    if (isOpen && !genesis) {
      loadGenesis()
    }
  }, [isOpen, genesis])

  async function loadGenesis() {
    try {
      const response = await fetch('/genesis.json')
      if (!response.ok) {
        throw new Error('Genesis file not found')
      }
      const data = await response.json()
      setGenesis(data)

      const genesisString = JSON.stringify(data)
      const hash = keccak256(toHex(genesisString))
      setGenesisHash(hash)
    } catch (error) {
      console.error('Failed to load genesis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!genesis) return

    const blob = new Blob([JSON.stringify(genesis, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'genesis.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  const validatorContract = genesis?.config.qbft?.validatorcontractaddress
  const chainId = genesis?.config.chainId

  // Network name for MetaMask
  const networkName = 'Besu QBFT Testnet'

  // Actual backend RPC URL for MetaMask (not the frontend proxy)
  const rpcUrl = 'http://130.61.22.253:8545'

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Network Configuration
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-500">
              Loading network information...
            </div>
          ) : genesis ? (
            <div className="space-y-4">
              {/* MetaMask Configuration Info */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Network Configuration (for MetaMask/Wallets)
                </div>
                <div className="space-y-3">
                  {/* Network Name */}
                  <div>
                    <div className="text-xs text-blue-700 mb-1">Network Name</div>
                    <div className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-blue-100">
                      {networkName}
                    </div>
                  </div>

                  {/* RPC URL */}
                  <div>
                    <div className="text-xs text-blue-700 mb-1 flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      RPC URL
                    </div>
                    <code className="text-xs font-mono text-gray-900 bg-white px-3 py-2 rounded border border-blue-100 block break-all">
                      {rpcUrl}
                    </code>
                  </div>

                  {/* Chain ID */}
                  <div>
                    <div className="text-xs text-blue-700 mb-1">Chain ID</div>
                    <div className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-blue-100">
                      {chainId}
                    </div>
                  </div>

                  {/* Currency Symbol */}
                  <div>
                    <div className="text-xs text-blue-700 mb-1">Currency Symbol</div>
                    <div className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-blue-100">
                      ETH
                    </div>
                  </div>
                </div>
              </div>

              {/* Validator Contract */}
              {validatorContract && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    Validator Contract Address
                  </div>
                  <code className="text-sm font-mono bg-white p-3 rounded border border-gray-200 block break-all">
                    {validatorContract}
                  </code>
                </div>
              )}

              {/* Genesis Hash */}
              {genesisHash && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 mb-2 flex items-center gap-1 font-medium">
                    <Hash className="h-3 w-3" />
                    Genesis Hash (for verification)
                  </div>
                  <code className="text-xs font-mono bg-white p-3 rounded border border-blue-200 block break-all text-gray-800">
                    {genesisHash}
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    Use this hash to verify you're on the correct network version
                  </p>
                </div>
              )}

              {/* Download Button */}
              <div className="pt-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Genesis File
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Genesis file not available
            </div>
          )}
        </div>
      </div>
    </>
  )
}
