import { useEffect } from 'react'
import { publicClient } from '@/lib/viem'
import { useBlockchainStore } from '@/store/blockchainStore'

export function useWatchBlocks() {
  const { setCurrentBlock, addBlock, setConnectionStatus } = useBlockchainStore()

  useEffect(() => {
    const unwatch = publicClient.watchBlocks({
      onBlock: (block) => {
        setCurrentBlock(block)
        addBlock(block)
        setConnectionStatus(true) // Set connected when we receive blocks
      },
      pollingInterval: 1_000,
      emitOnBegin: true,
      onError: (error) => {
        console.error('Block watching error:', error)
        setConnectionStatus(false)
      },
    })

    return () => {
      unwatch()
    }
  }, [setCurrentBlock, addBlock, setConnectionStatus])
}
