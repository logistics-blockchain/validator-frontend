import { useState } from 'react'
import { publicClient, createWalletClientForAccount } from '@/lib/viem'
import { useAccountStore } from '@/store/accountStore'
import { formatViemError } from '@/lib/utils'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ContractFunction } from '@/types/contracts'
import type { Address, Abi } from 'viem'

interface FunctionFormProps {
  func: ContractFunction
  funcIndex: number
  contractAddress: Address
  contractAbi: Abi
  isOpen: boolean
  onToggle: () => void
}

export function FunctionForm({
  func,
  funcIndex,
  contractAddress,
  contractAbi,
  isOpen,
  onToggle,
}: FunctionFormProps) {
  const { selectedAccountIndex } = useAccountStore()
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isReadFunction = func.stateMutability === 'view' || func.stateMutability === 'pure'

  const handleInputChange = (paramName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [paramName]: value }))
  }

  const parseInput = (value: string, type: string): unknown => {
    if (type === 'address') {
      return value as Address
    } else if (type.startsWith('uint') || type.startsWith('int')) {
      return BigInt(value || '0')
    } else if (type === 'bool') {
      return value === 'true'
    } else if (type.startsWith('bytes')) {
      return value as `0x${string}`
    } else if (type.endsWith('[]')) {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return value
  }

  const handleExecute = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const args = func.inputs.map((input) => parseInput(inputs[input.name] || '', input.type))

      if (isReadFunction) {
        // Read function
        const data = await publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: func.name,
          args,
        })
        setResult(data)
      } else {
        // Write function
        const walletClient = createWalletClientForAccount(selectedAccountIndex)

        try {
          // Try to simulate first for better error messages
          const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: func.name,
            args,
            account: walletClient.account,
          })

          const hash = await walletClient.writeContract(request)
          const receipt = await publicClient.waitForTransactionReceipt({ hash })

          setResult({
            hash,
            status: receipt.status,
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
          })
        } catch (simError: any) {
          // If simulation fails, try sending directly for better error handling
          console.log('Simulation failed, sending transaction directly...', simError)

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: func.name,
            args,
          })

          const receipt = await publicClient.waitForTransactionReceipt({ hash })

          if (receipt.status === 'success') {
            setResult({
              hash,
              status: receipt.status,
              blockNumber: receipt.blockNumber.toString(),
              gasUsed: receipt.gasUsed.toString(),
            })
          } else {
            throw new Error('Transaction reverted')
          }
        }
      }
    } catch (err: any) {
      setError(formatViemError(err))
      console.error('Function execution error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg bg-white">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <div className="font-mono font-semibold text-gray-800">
          {funcIndex}. {func.name}
        </div>
        <Badge variant={isReadFunction ? 'secondary' : 'default'}>
          {isReadFunction ? 'READ' : 'WRITE'}
        </Badge>
        {func.stateMutability === 'payable' && <Badge variant="warning">PAYABLE</Badge>}
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 border-t space-y-4 bg-gray-50/50">
          {func.inputs.length > 0 && (
            <div className="space-y-3">
              {func.inputs.map((input) => (
                <div key={input.name}>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    {input.name || 'unnamed'} <span className="text-gray-500 font-mono">({input.type})</span>
                  </label>
                  <input
                    type="text"
                    value={inputs[input.name] || ''}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    placeholder={`Enter ${input.type}`}
                    className="w-full p-2 border rounded-md text-sm bg-white border-gray-300"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleExecute} disabled={loading} className="w-full">
            {loading ? 'Executing...' : isReadFunction ? 'Read' : 'Execute'}
          </Button>

          {result && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-sm font-medium text-green-800 mb-1">Result:</div>
              <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(
                  result,
                  (key, value) => (typeof value === 'bigint' ? value.toString() : value),
                  2
                )}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border-red-200 rounded">
              <div className="text-sm font-medium text-red-800 mb-1">Error:</div>
              <div className="text-xs text-red-700">{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
