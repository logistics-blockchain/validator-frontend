import { useEffect, useState } from 'react'
import { useBlockchainStore } from '@/store/blockchainStore'
import { getAvailableNetworks, getActiveNetworkId, setActiveNetwork, reloadNetworksConfig } from '@/lib/viem'
import { saveCustomNetwork, removeCustomNetwork, generateNetworkId } from '@/lib/customNetworks'
import { CustomNetworkDialog } from '@/components/network/CustomNetworkDialog'
import { Network, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { NetworkConfig } from '@/lib/viem'

export function NetworkSelector() {
  const { activeNetworkId, availableNetworks, setActiveNetworkId, setAvailableNetworks } = useBlockchainStore()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomDialog, setShowCustomDialog] = useState(false)

  useEffect(() => {
    loadNetworks()
  }, [setAvailableNetworks, setActiveNetworkId])

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

  const handleAddCustomNetwork = async (network: { name: string; rpcUrl: string; chainId: number }) => {
    try {
      const networkId = generateNetworkId(network.name)
      saveCustomNetwork({
        id: networkId,
        name: network.name,
        chainId: network.chainId,
        rpcUrl: network.rpcUrl,
        description: 'Custom network'
      })

      // Reload networks config to include the new custom network
      await reloadNetworksConfig()
      await loadNetworks()

      console.log('✅ Added custom network:', network.name)
    } catch (error) {
      console.error('Failed to add custom network:', error)
      alert(error instanceof Error ? error.message : 'Failed to add custom network')
    }
  }

  const handleRemoveCustomNetwork = async (networkId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Remove this custom network?')) {
      return
    }

    try {
      removeCustomNetwork(networkId)
      await reloadNetworksConfig()
      await loadNetworks()

      console.log('✅ Removed custom network:', networkId)
    } catch (error) {
      console.error('Failed to remove custom network:', error)
    }
  }

  const activeNetwork = availableNetworks.find(n => n.id === activeNetworkId)

  if (availableNetworks.length === 0) {
    return null
  }

  const isCustomNetwork = (network: NetworkConfig) => network.id.startsWith('custom-')

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
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {network.name}
                        </div>
                        {isCustomNetwork(network) && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      {network.description && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {network.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">
                        Chain ID: {network.chainId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {network.id === activeNetworkId && (
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                      {isCustomNetwork(network) && (
                        <button
                          onClick={(e) => handleRemoveCustomNetwork(network.id, e)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove custom network"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowCustomDialog(true)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add Custom Network</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <CustomNetworkDialog
        isOpen={showCustomDialog}
        onClose={() => setShowCustomDialog(false)}
        onAdd={handleAddCustomNetwork}
      />
    </div>
  )
}
