import { useContractStore } from '@/store/contractStore'
import { useDeployProxy } from './useDeployProxy'
import { useCreateOrder } from './useCreateOrder'
import { useUpdateOrderState } from './useUpdateOrderState'

export { useRefreshFactory } from './useRefreshFactory'
export { useDeployProxy } from './useDeployProxy'
export { useCreateOrder } from './useCreateOrder'
export { useUpdateOrderState } from './useUpdateOrderState'

export function useFactoryActions() {
  const { deploymentPattern } = useContractStore()
  const { deployProxy, loading: deployLoading, error: deployError } = useDeployProxy()
  const { createOrder, loading: createLoading, error: createError } = useCreateOrder()
  const { updateOrderState, loading: updateLoading, error: updateError } = useUpdateOrderState()

  if (deploymentPattern !== 'factory') {
    return {
      deployProxy: async () => {
        throw new Error('Not in factory mode')
      },
      createOrder: async () => {
        throw new Error('Not in factory mode')
      },
      updateOrderState: async () => {
        throw new Error('Not in factory mode')
      },
      loading: false,
      error: 'Not in factory mode',
    }
  }

  return {
    deployProxy,
    createOrder,
    updateOrderState,
    loading: deployLoading || createLoading || updateLoading,
    error: deployError || createError || updateError,
  }
}
