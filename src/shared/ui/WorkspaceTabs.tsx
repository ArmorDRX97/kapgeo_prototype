import './workspace.css'
import { useId, useRef, type ReactNode } from 'react'

type WorkspaceTab = { id: string; label: ReactNode }

/** A horizontal tab strip with roving focus. Only this strip scrolls on selection. */
export function WorkspaceTabs({ tabs, value, onChange, label, children }: {
  tabs: readonly WorkspaceTab[]
  value: string
  onChange: (id: string) => void
  label: string
  children: ReactNode
}) {
  const id = useId()
  const list = useRef<HTMLDivElement>(null)
  const select = (index: number) => {
    const tab = tabs[index]
    if (!tab) return
    onChange(tab.id)
    const button = list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]
    button?.focus({ preventScroll: true })
    if (button && list.current) {
      const overflow = button.offsetLeft - list.current.offsetLeft
      if (overflow < list.current.scrollLeft) list.current.scrollLeft = overflow
      else if (overflow + button.offsetWidth > list.current.scrollLeft + list.current.clientWidth) list.current.scrollLeft = overflow + button.offsetWidth - list.current.clientWidth
    }
  }
  return <>
    <div className="workspace-tabs" role="tablist" aria-label={label} ref={list}>
      {tabs.map((tab, index) => <button key={tab.id} id={`${id}-${tab.id}`} type="button" role="tab" aria-selected={value === tab.id} aria-controls={`${id}-panel`} tabIndex={value === tab.id ? 0 : -1} onClick={() => { if (value !== tab.id) onChange(tab.id) }} onKeyDown={(event) => {
        const destination = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
        if (destination !== null) { event.preventDefault(); select(destination) }
      }}>{tab.label}</button>)}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${value}`} tabIndex={0} className="workspace-tab-panel">{children}</div>
  </>
}
