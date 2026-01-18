import type { FactoryDeploymentInfo, DeploymentPattern } from '@/types/contracts'

export type { DeploymentPattern }

export interface PatternDetection {
  pattern: DeploymentPattern
  deploymentInfo: FactoryDeploymentInfo | null
}

/**
 * Detect factory deployment pattern
 * Only factory pattern is supported
 */
export async function detectDeploymentPattern(): Promise<PatternDetection> {
  // Try Besu factory deployment first
  try {
    const besuFactoryResponse = await fetch('/deployment-besu-factory.json')
    if (besuFactoryResponse.ok) {
      const info: FactoryDeploymentInfo = await besuFactoryResponse.json()
      if (info.pattern === 'factory') {
        return { pattern: 'factory', deploymentInfo: info }
      }
    }
  } catch {
    // Continue to next check
  }

  // Try Hardhat factory deployment
  try {
    const factoryResponse = await fetch('/deployment-factory.json')
    if (factoryResponse.ok) {
      const info: FactoryDeploymentInfo = await factoryResponse.json()
      if (info.pattern === 'factory') {
        return { pattern: 'factory', deploymentInfo: info }
      }
    }
  } catch {
    // No factory deployment found
  }

  return { pattern: 'unknown', deploymentInfo: null }
}

/**
 * Check if the deployment is using factory pattern
 */
export function isFactoryPattern(info: FactoryDeploymentInfo | null): info is FactoryDeploymentInfo {
  return info !== null && 'pattern' in info && info.pattern === 'factory'
}
