import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { DiscardChangesDialog } from '../ui/DiscardChangesDialog'
import { useReportUnsavedChanges } from './useReportUnsavedChanges'

function formSnapshot(root: HTMLElement | null) {
  return JSON.stringify(Array.from(root?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input:not([type=hidden]), textarea, select') ?? []).map(input => ({
    name: input.name || input.id || input.getAttribute('aria-label'), type: input.type,
    value: input instanceof HTMLInputElement && ['checkbox', 'radio'].includes(input.type) ? input.checked : input.value,
  })))
}
const dismissLabel = /^(?:Отмена|Отменить(?:\s(?:ввод|изменения|редактирование))?|Закрыть(?:\s.*)?|Назад)$/i
function submitButton(root: HTMLElement | null) {
  const buttons = Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? []).filter(button => !button.disabled)
  return buttons.find(button => /^(?:Сохранить|Применить|Создать)(?:\s|$)/.test(button.textContent?.trim() ?? '')) ?? buttons.find(button => button.getAttribute('type') === 'submit')
}

/** Covers Escape, backdrop and dismiss buttons in both native and legacy form dialogs. */
export function useDialogDismissGuard(ref: RefObject<HTMLElement | null>, { onClose, pending = false, dirty, onSave }: {
  onClose: () => void; pending?: boolean; dirty?: boolean; onSave?: () => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState(false), [fieldsDirty, setFieldsDirty] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)
  const saveButton = useRef<HTMLButtonElement | undefined>(undefined)
  const baseline = useRef<string | null>(null)
  const current = useRef({ onClose, pending, dirty, onSave })
  useLayoutEffect(() => { current.current = { onClose, pending, dirty, onSave } })
  const isDirty = useCallback(() => current.current.dirty ?? (baseline.current !== null && formSnapshot(ref.current) !== baseline.current), [ref])
  const requestClose = useCallback(() => {
    if (current.current.pending) return
    if (isDirty()) { saveButton.current = submitButton(ref.current); setCanSubmit(Boolean(saveButton.current || current.current.onSave)); setConfirm(true) }
    else current.current.onClose()
  }, [isDirty, ref])
  useEffect(() => {
    const root = ref.current
    if (!root) return
    baseline.current = formSnapshot(root)
    const change = () => setFieldsDirty(isDirty())
    const afterClick = () => queueMicrotask(change)
    const click = (event: Event) => {
      const button = (event.target as Element).closest('button')
      if (button?.closest('dialog, [role=dialog]') !== root) return
      const label = button?.getAttribute('aria-label') ?? button?.textContent?.trim() ?? ''
      if (dismissLabel.test(label) && (isDirty() || current.current.pending)) {
        event.preventDefault(); event.stopImmediatePropagation(); requestClose()
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isDirty()) return
      event.preventDefault(); event.stopImmediatePropagation(); requestClose()
    }
    const backdrop = (event: Event) => {
      if (event.target !== root.parentElement || !(isDirty() || current.current.pending)) return
      event.preventDefault(); event.stopImmediatePropagation(); requestClose()
    }
    const parent = root.parentElement?.className.includes('backdrop') ? root.parentElement : null
    root.addEventListener('input', change); root.addEventListener('change', change)
    root.addEventListener('click', afterClick)
    root.addEventListener('click', click, true); root.addEventListener('keydown', escape, true)
    parent?.addEventListener('mousedown', backdrop, true)
    return () => {
      root.removeEventListener('input', change); root.removeEventListener('change', change)
      root.removeEventListener('click', afterClick)
      root.removeEventListener('click', click, true); root.removeEventListener('keydown', escape, true)
      parent?.removeEventListener('mousedown', backdrop, true)
    }
  }, [ref, isDirty, requestClose])
  useReportUnsavedChanges(dirty ?? fieldsDirty, undefined, { discard: onClose, save: onSave ?? (async () => false) })
  const confirmation = confirm && <DiscardChangesDialog action="close" onStay={() => setConfirm(false)} onDiscard={() => { setConfirm(false); onClose() }} onSave={canSubmit ? () => {
    setConfirm(false)
    if (onSave) void onSave()
    else { const button = saveButton.current; requestAnimationFrame(() => button?.click()) }
  } : undefined} />
  return { requestClose, confirmation }
}
