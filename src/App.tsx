import { useState } from 'react'
import { useBlockchainStore } from './store/blockchainStore'
import { useContractStore } from './store/contractStore'
import { AccountManagementPanel } from './components/AccountManagementPanel'
import { ContractDashboard } from './components/ContractDashboard'
import { RealtimeMonitor } from './components/RealtimeMonitor'
import { FactoryDashboard } from './components/FactoryDashboard'
import { ManufacturerProxyPanel } from './components/ManufacturerProxyPanel'
import { ExplorerView } from './components/ExplorerView'
import { ValidatorView } from './components/ValidatorView'
import { NetworkSelector } from './components/NetworkSelector'
import { NetworkInfoDialog } from './components/NetworkInfoDialog'
import { BridgeView } from './components/BridgeView'
import { AIModelsView } from './components/AIModelsView'
import { useWatchBlocks } from './hooks/useWatchBlocks'
import { useAccountBalance } from './hooks/useAccountBalance'
import { useContracts } from './hooks/useContracts'
import { useFactoryActions } from './hooks/useFactoryActions'
import { useFactoryEvents } from './hooks/useFactoryEvents'
import { Button } from './components/ui/Button'
import { RefreshCw, Home, Search, Shield, Database, ArrowLeftRight, Brain } from 'lucide-react'
import type { Hash, Address } from 'viem'
import { createContext, useContext } from 'react'

interface NavigationContextType {
  navigateToExplorer: (initialView?: ExplorerInitialView) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationContext.Provider')
  }
  return context
}

type AppView = 'dashboard' | 'explorer' | 'validators' | 'bridge' | 'aimodels'

export interface ExplorerInitialView {
  address?: Address
  blockNumber?: bigint
  txHash?: Hash
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard')
  const [explorerInitialView, setExplorerInitialView] = useState<ExplorerInitialView | undefined>()
  const [showNetworkInfo, setShowNetworkInfo] = useState(false)

  // Initialize blockchain monitoring
  useWatchBlocks()
  useAccountBalance()
  useContracts()
  useFactoryEvents() // Auto-update on ProxyDeployed events

  const { refreshing, handleRefresh } = useBlockchainStore()
  const { deploymentPattern } = useContractStore()
  const { deployProxy } = useFactoryActions()

  // Check if we're in factory mode
  const isFactoryMode = deploymentPattern === 'factory'

  const navigateToExplorer = (initialView?: ExplorerInitialView) => {
    setExplorerInitialView(initialView)
    setCurrentView('explorer')
  }

  const navigationContextValue: NavigationContextType = {
    navigateToExplorer,
  }

  return (
    <NavigationContext.Provider value={navigationContextValue}>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>

              {/* Navigation */}
              <nav className="flex gap-2">
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  onClick={() => setCurrentView('validators')}
                  variant={currentView === 'validators' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Validators
                </Button>
                <Button
                  onClick={() => {
                    setExplorerInitialView(undefined)
                    setCurrentView('explorer')
                  }}
                  variant={currentView === 'explorer' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Block Explorer
                </Button>
                <Button
                  onClick={() => setCurrentView('bridge')}
                  variant={currentView === 'bridge' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Bridge
                </Button>
                <Button
                  onClick={() => setCurrentView('aimodels')}
                  variant={currentView === 'aimodels' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Brain className="h-4 w-4" />
                  AI Models
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowNetworkInfo(true)}
                variant="outline"
                size="sm"
                className="gap-2 bg-white border-gray-300 hover:bg-gray-50"
                title="View network configuration and genesis"
              >
                <Database className="h-4 w-4" />
                Network Info
              </Button>
              <NetworkSelector />
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="gap-2 bg-white border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Account + Realtime Monitor + Factory Controls */}
            <div className="space-y-6">
              <AccountManagementPanel />
              <RealtimeMonitor />

              {/* Factory Mode: Show manufacturer proxy panel */}
              {isFactoryMode && (
                <ManufacturerProxyPanel onDeployProxy={deployProxy} />
              )}
            </div>

            {/* Right Column: Contract Dashboard or Factory Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {/* Factory Mode: Show factory overview */}
              {isFactoryMode && <FactoryDashboard />}

              {/* Contract Dashboard (works in both modes) */}
              <ContractDashboard />
            </div>
          </div>
        ) : currentView === 'validators' ? (
          /* Validators View */
          <ValidatorView />
        ) : currentView === 'bridge' ? (
          /* Bridge View */
          <BridgeView />
        ) : currentView === 'aimodels' ? (
          /* AI Models View */
          <AIModelsView />
        ) : (
          /* Block Explorer View */
          <ExplorerView initialView={explorerInitialView} />
        )}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
        </div>
      </footer>

      {/* Network Info Dialog */}
      <NetworkInfoDialog isOpen={showNetworkInfo} onClose={() => setShowNetworkInfo(false)} />
    </div>
    </NavigationContext.Provider>
  )
}

export default App
