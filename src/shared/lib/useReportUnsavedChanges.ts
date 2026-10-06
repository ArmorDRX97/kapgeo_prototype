import { useEffect } from 'react'

/** Let a containing workspace guard navigation while an independent editor is dirty. */
export function useReportUnsavedChanges(dirty: boolean, onDirtyChange?: (dirty: boolean) => void) {
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])
}
