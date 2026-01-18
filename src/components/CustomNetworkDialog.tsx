import { useState } from 'react'
import { Button } from './ui/Button'
import { X } from 'lucide-react'

interface CustomNetworkDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (network: { name: string; rpcUrl: string; chainId: number }) => void
}

export function CustomNetworkDialog({ isOpen, onClose, onAdd }: CustomNetworkDialogProps) {
  const [name, setName] = useState('')
  const [rpcUrl, setRpcUrl] = useState('')
  const [chainId, setChainId] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate HTTPS requirement for cloud-hosted frontend
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocalDev && !rpcUrl.startsWith('https://') && !rpcUrl.startsWith('/')) {
      alert('Cloud-hosted frontend requires HTTPS URLs.\n\nHTTP URLs are blocked by browsers (mixed content).\n\nOptions:\n- Use HTTPS URL\n- Use ngrok with HTTPS: ngrok http 8545\n- Run frontend locally for HTTP support')
      return
    }

    if (name && rpcUrl && chainId) {
      onAdd({
        name,
        rpcUrl,
        chainId: parseInt(chainId)
      })
      setName('')
      setRpcUrl('')
      setChainId('')
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Custom Network</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              Requirements for Cloud-Hosted Frontend:
            </p>
            <ul className="text-xs text-yellow-700 space-y-1.5">
              <li className="flex gap-2">
                <span className="font-bold">✓</span>
                <span>Must be <strong>HTTPS</strong> URL (browsers block HTTP from HTTPS pages)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">✓</span>
                <span>Must be publicly accessible from the internet</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">💡</span>
                <span>Expose local node: <code className="bg-yellow-100 px-1.5 py-0.5 rounded font-mono">cloudflared tunnel --url http://localhost:8545</code></span>
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Network Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Local Besu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RPC URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value)}
                  placeholder="https://abc123.ngrok.io"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
                <p className="text-xs text-red-600 mt-1 font-medium">
                  Must be HTTPS (HTTP blocked by browsers)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chain ID
                </label>
                <input
                  type="text"
                  value={chainId}
                  onChange={(e) => setChainId(e.target.value)}
                  placeholder="10001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button type="button" onClick={onClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Network
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
