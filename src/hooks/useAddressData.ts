import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useContractStore } from '@/store/contractStore'
import type { AddressInfo } from '@/types/explorer'
import type { Address } from 'viem'

/**
 * Hook to fetch address information (balance, tx count, contract status)
 */
export function useAddressData(address: Address | null) {
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const { contracts } = useContractStore()

  useEffect(() => {
    if (!address) {
      setAddressInfo(null)
      return
    }

    const loadAddressInfo = async () => {
      setLoading(true)
      try {
        // Fetch basic address data in parallel
        const [balance, txCount, code] = await Promise.all([
          publicClient.getBalance({ address }),
          publicClient.getTransactionCount({ address }),
          publicClient.getCode({ address }),
        ])

        const isContract = code !== undefined && code !== '0x'

        // Check if this address is in our contracts list
        const knownContract = contracts.find(
          (c) => c.address.toLowerCase() === address.toLowerCase()
        )

        const info: AddressInfo = {
          address,
          balance,
          transactionCount: txCount,
          isContract,
          code: isContract ? code : undefined,
          contractName: knownContract?.name,
          isProxy: knownContract?.isProxy,
          proxyType: knownContract?.proxyType,
          implementation: knownContract?.implementation as Address | undefined,
        }

        setAddressInfo(info)
      } catch (error) {
        console.error('[AddressData] Error loading address info:', error)
        setAddressInfo(null)
      } finally {
        setLoading(false)
      }
    }

    loadAddressInfo()
  }, [address, contracts])

  return { addressInfo, loading }
}
