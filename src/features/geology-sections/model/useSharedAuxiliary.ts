import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sharedAuxiliaryRepository } from '../../../repository/demo/sharedAuxiliaryRepository'
import { SHARED_AUXILIARY_STORAGE_KEY } from '../../../repository/demo/sectionStorageKeys'
export const sharedAuxiliaryQueryKey = ['geology-section-shared-auxiliary'] as const
export function useSharedAuxiliary() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: sharedAuxiliaryQueryKey, queryFn: async () => sharedAuxiliaryRepository.list(), retry: false })
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === SHARED_AUXILIARY_STORAGE_KEY || event.key === null) void queryClient.invalidateQueries({ queryKey: sharedAuxiliaryQueryKey }) }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [queryClient])
  return query
}
