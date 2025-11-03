import type { DeploymentInfo, FactoryDeploymentInfo } from '@/types/contracts'

export type DeploymentPattern = 'shared-proxy' | 'factory' | 'unknown'

export interface PatternDetection {
  pattern: DeploymentPattern
  deploymentInfo: DeploymentInfo | FactoryDeploymentInfo | null
}

/**
 * Detect which deployment pattern is being used
 * Checks for factory deployments first, then shared proxy deployments
 */
export async function detectDeploymentPattern(): Promise<PatternDetection> {
  // Try Besu factory deployment first
  try {
    const besuFactoryResponse = await fetch('/deployment-besu-factory.json')
    if (besuFactoryResponse.ok) {
      const info: FactoryDeploymentInfo = await besuFactoryResponse.json()
      if (info.pattern === 'factory') {
        console.log('✅ Besu factory pattern detected')
        return { pattern: 'factory', deploymentInfo: info }
      }
    }
  } catch (e) {
    // Continue to next check
    console.log('No Besu factory deployment found, checking Hardhat factory...')
  }

  // Try Hardhat factory deployment
  try {
    const factoryResponse = await fetch('/deployment-factory.json')
    if (factoryResponse.ok) {
      const info: FactoryDeploymentInfo = await factoryResponse.json()
      if (info.pattern === 'factory') {
        console.log('✅ Hardhat factory pattern detected')
        return { pattern: 'factory', deploymentInfo: info }
      }
    }
  } catch (e) {
    // Continue to shared proxy check
    console.log('No Hardhat factory deployment found, checking for shared proxy...')
  }

  // Try Besu shared proxy deployment
  try {
    const besuResponse = await fetch('/deployment-besu.json')
    if (besuResponse.ok) {
      const info: DeploymentInfo = await besuResponse.json()
      console.log('✅ Besu deployment detected (shared proxy pattern)')
      return { pattern: 'shared-proxy', deploymentInfo: info }
    }
  } catch (e) {
    // Continue to standard deployment check
    console.log('No Besu deployment found, checking for standard deployment...')
  }

  // Try Hardhat shared proxy deployment
  try {
    const sharedResponse = await fetch('/deployment-info.json')
    if (sharedResponse.ok) {
      const info: DeploymentInfo = await sharedResponse.json()
      console.log('✅ Hardhat shared proxy pattern detected')
      return { pattern: 'shared-proxy', deploymentInfo: info }
    }
  } catch (e) {
    // No deployment found
    console.log('No deployment files found')
  }

  console.warn('⚠️ No deployment pattern detected')
  return { pattern: 'unknown', deploymentInfo: null }
}

/**
 * Check if the deployment is using factory pattern
 */
export function isFactoryPattern(info: DeploymentInfo | FactoryDeploymentInfo | null): info is FactoryDeploymentInfo {
  return info !== null && 'pattern' in info && info.pattern === 'factory'
}
