import type { Abi } from 'viem'

export async function loadABI(contractName: string): Promise<Abi | null> {
  try {
    const response = await fetch(`/artifacts/${contractName}.json`)
    if (response.ok) {
      const artifact = await response.json()
      return artifact.abi as Abi
    }
    return null
  } catch (error) {
    console.error(`Error loading ABI for ${contractName}:`, error)
    return null
  }
}

export async function loadABIWithSource(contractName: string): Promise<{ abi: Abi; sourceCode?: string } | null> {
  try {
    const response = await fetch(`/artifacts/${contractName}.json`)
    if (response.ok) {
      const artifact = await response.json()
      return {
        abi: artifact.abi as Abi,
        sourceCode: artifact.sourceCode,
      }
    }
    return null
  } catch (error) {
    console.error(`Error loading ABI for ${contractName}:`, error)
    return null
  }
}

export async function loadImplementationABI(
  baseName: string,
  fallbackNames: string[] = []
): Promise<Abi | null> {
  const namesToTry = [
    baseName.replace('Proxy', ''),
    baseName.replace('Proxy', 'V1'),
    baseName.replace('Proxy', 'V2'),
    baseName.replace('Proxy', 'Implementation'),
    'LogisticsOrder',
    'LogisticsOrderV1',
    'LogisticsOrderV2',
    ...fallbackNames,
  ]

  for (const implName of namesToTry) {
    try {
      const implResponse = await fetch(`/artifacts/${implName}.json`)
      if (implResponse.ok) {
        const implArtifact = await implResponse.json()
        return implArtifact.abi as Abi
      }
    } catch {
      continue
    }
  }

  return null
}
