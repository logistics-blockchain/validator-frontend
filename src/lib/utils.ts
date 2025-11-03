import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatEther(wei: bigint): string {
  const ether = Number(wei) / 1e18
  return ether.toFixed(4)
}

export function formatViemError(error: any): string {
  // Extract revert reason from error
  const errorString = JSON.stringify(error)

  // Check for common access control errors
  if (errorString.includes('OwnableUnauthorizedAccount') || errorString.includes('Ownable:')) {
    return 'Access denied: Only the contract owner can call this function'
  }

  if (errorString.includes('NotRegistered') || errorString.includes('not registered')) {
    return 'Access denied: Address is not registered as a manufacturer'
  }

  if (errorString.includes('NotManufacturer')) {
    return 'Access denied: Only the order manufacturer can call this function'
  }

  // Standard error checks
  if (error.message?.includes('execution reverted')) {
    // Try to extract the revert reason
    const match = error.message.match(/reverted with reason string '([^']+)'/)
    if (match) {
      return `Transaction reverted: ${match[1]}`
    }
    return 'Transaction reverted (check console for details)'
  }

  if (error.message?.includes('insufficient funds')) {
    return 'Insufficient ETH balance'
  }

  if (error.message?.includes('nonce too high')) {
    return 'Connection issue. Please refresh.'
  }

  // Return the most informative error message available
  return error.shortMessage || error.message || 'Unknown error'
}
