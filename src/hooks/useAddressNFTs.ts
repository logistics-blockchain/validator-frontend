import { useEffect, useState } from 'react'
import { publicClient } from '@/lib/viem'
import { useContractStore } from '@/store/contractStore'
import type { Address } from 'viem'
import type { Order } from '@/types/contracts'

/**
 * NFT with contract information
 */
export interface NFTWithContract {
  tokenId: bigint
  contractAddress: Address
  contractName: string
  order?: Order
}

/**
 * Hook to fetch NFTs owned by an address
 * Checks all known ERC-721 contracts
 */
export function useAddressNFTs(address: Address | null) {
  const [nfts, setNfts] = useState<NFTWithContract[]>([])
  const [loading, setLoading] = useState(false)
  const { contracts, manufacturerProxies } = useContractStore()

  useEffect(() => {
    if (!address) {
      setNfts([])
      return
    }

    const loadNFTs = async () => {
      setLoading(true)
      try {
        console.log('[AddressNFTs] Checking NFT ownership for address:', address)

        const allNFTs: NFTWithContract[] = []

        // Build list of all contracts to check (both regular contracts and manufacturer proxies)
        const contractsToCheck = [...contracts]

        // Add manufacturer proxies as contracts to check
        for (const proxy of manufacturerProxies) {
          // Find the implementation ABI from contracts
          const implContract = contracts.find(c => c.name.includes('LogisticsOrder') && !c.isProxy)
          if (implContract) {
            contractsToCheck.push({
              name: proxy.manufacturerName || `Manufacturer ${proxy.manufacturer.slice(0, 6)}`,
              address: proxy.proxyAddress,
              abi: implContract.abi,
              isProxy: true,
            })
          }
        }

        console.log('[AddressNFTs] Checking', contractsToCheck.length, 'contracts (including proxies)')

        // Check each contract that might be an ERC-721
        for (const contract of contractsToCheck) {
          // Check if contract has ERC-721 interface (has balanceOf and ownerOf)
          const hasBalanceOf = contract.abi.some(
            (item: any) => item.type === 'function' && item.name === 'balanceOf'
          )
          const hasOwnerOf = contract.abi.some(
            (item: any) => item.type === 'function' && item.name === 'ownerOf'
          )
          const hasTotalSupply = contract.abi.some(
            (item: any) => item.type === 'function' && item.name === 'getTotalSupply'
          )

          if (!hasBalanceOf || !hasOwnerOf) {
            continue // Not an ERC-721 contract
          }

          console.log('[AddressNFTs] Checking contract:', contract.name)

          try {
            // Get total supply to know how many tokens to check
            let totalSupply: bigint = 0n

            if (hasTotalSupply) {
              totalSupply = (await publicClient.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: 'getTotalSupply',
              })) as bigint
            } else {
              // Fallback: check balance first
              const balance = (await publicClient.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: 'balanceOf',
                args: [address],
              })) as bigint

              if (balance === 0n) {
                continue // No tokens in this contract
              }

              // If no getTotalSupply, we'll have to try sequential IDs
              // This is not ideal but works for small collections
              totalSupply = 100n // Arbitrary limit
            }

            console.log('[AddressNFTs] Total supply for', contract.name, ':', totalSupply.toString())

            // Check each token to see if this address owns it
            // Start from 0n to cover both 0-indexed and 1-indexed NFT collections
            for (let tokenId = 0n; tokenId <= totalSupply && tokenId <= 100n; tokenId++) {
              try {
                const owner = (await publicClient.readContract({
                  address: contract.address,
                  abi: contract.abi,
                  functionName: 'ownerOf',
                  args: [tokenId],
                })) as Address

                console.log('[AddressNFTs] Token', tokenId.toString(), 'owner:', owner)

                if (owner.toLowerCase() === address.toLowerCase()) {
                  console.log('[AddressNFTs] ✓ Found NFT:', contract.name, 'Token ID:', tokenId.toString())

                  // Try to get order details if available
                  let order: Order | undefined
                  const hasGetOrder = contract.abi.some(
                    (item: any) => item.type === 'function' && item.name === 'getOrder'
                  )

                  if (hasGetOrder) {
                    try {
                      order = (await publicClient.readContract({
                        address: contract.address,
                        abi: contract.abi,
                        functionName: 'getOrder',
                        args: [tokenId],
                      })) as Order
                    } catch (error) {
                      console.log('[AddressNFTs] Could not fetch order details:', error)
                    }
                  }

                  allNFTs.push({
                    tokenId,
                    contractAddress: contract.address,
                    contractName: contract.name,
                    order,
                  })
                }
              } catch (error) {
                // Token doesn't exist or error fetching owner, skip it
                break // No more tokens in this contract
              }
            }
          } catch (error) {
            console.log('[AddressNFTs] Error checking contract', contract.name, ':', error)
          }
        }

        console.log(`[AddressNFTs] Found ${allNFTs.length} NFTs owned by address`)
        setNfts(allNFTs)
      } catch (error) {
        console.error('[AddressNFTs] Error loading NFTs:', error)
        setNfts([])
      } finally {
        setLoading(false)
      }
    }

    loadNFTs()
  }, [address, contracts, manufacturerProxies])

  return { nfts, loading }
}
