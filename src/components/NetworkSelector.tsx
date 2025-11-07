import { useEffect, useState } from 'react'
import { useBlockchainStore } from '@/store/blockchainStore'
import { getAvailableNetworks, getActiveNetworkId, setActiveNetwork } from '@/lib/viem'
import { Network, ChevronDown } from 'lucide-react'
import type { NetworkConfig } from '@/lib/viem'

export function NetworkSelector() {
  const { activeNetworkId, availableNetworks, setActiveNetworkId, setAvailableNetworks } = useBlockchainStore()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function loadNetworks() {
      try {
        const networks = await getAvailableNetworks()
        setAvailableNetworks(networks)
        const currentNetworkId = getActiveNetworkId()
        setActiveNetworkId(currentNetworkId)
      } catch (error) {
        console.error('Failed to load networks:', error)
      }
    }
    loadNetworks()
  }, [setAvailableNetworks, setActiveNetworkId])

  const handleNetworkChange = async (networkId: string) => {
    if (networkId === activeNetworkId) {
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      await setActiveNetwork(networkId)
      setActiveNetworkId(networkId)
      setIsOpen(false)

      // Reload the page to reinitialize all connections
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Failed to switch network:', error)
      setLoading(false)
    }
  }

  const activeNetwork = availableNetworks.find(n => n.id === activeNetworkId)

  if (availableNetworks.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Network className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {activeNetwork?.name || 'Select Network'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {availableNetworks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkChange(network.id)}
                  disabled={loading}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                    network.id === activeNetworkId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {network.name}
                      </div>
                      {network.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {network.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">
                        Chain ID: {network.chainId}
                      </div>
                    </div>
                    {network.id === activeNetworkId && (
                      <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
