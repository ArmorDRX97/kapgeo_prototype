import { useContext, useEffect, useLayoutEffect, useRef } from 'react'
import { UnsavedChangesContext, type UnsavedEditor } from './unsavedChangesContext'

/** Let a containing workspace guard navigation while an independent editor is dirty. */
export function useReportUnsavedChanges(dirty: boolean, onDirtyChange?: (dirty: boolean) => void, actions?: Omit<UnsavedEditor, 'dirty'>) {
  const context = useContext(UnsavedChangesContext)
  const editor = useRef<UnsavedEditor>({ dirty, save: async () => false, discard: () => undefined })
  useLayoutEffect(() => { editor.current = { dirty, save: actions?.save ?? (async () => false), discard: actions?.discard ?? (() => undefined) } }, [dirty, actions])
  const register = context?.register
  const hasActions = Boolean(actions)
  useEffect(() => hasActions ? register?.(editor) : undefined, [register, hasActions])
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])
}
