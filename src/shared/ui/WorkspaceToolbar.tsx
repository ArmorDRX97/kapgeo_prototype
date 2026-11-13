import { useId, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Clock3, GripVertical, Lock, PanelLeft, PanelRight, PanelTop } from 'lucide-react'
import { Button } from './Button'
import { Tooltip } from './Tooltip'
import './workspace-toolbar.css'

const positions = [
  { id: 'left', label: 'Слева', icon: PanelLeft },
  { id: 'top', label: 'Сверху', icon: PanelTop },
  { id: 'right', label: 'Справа', icon: PanelRight },
] as const
type ToolbarDock = (typeof positions)[number]['id']

function readDock(preferenceKey: string): ToolbarDock {
  try {
    const saved = localStorage.getItem(preferenceKey)
    return positions.find(position => position.id === saved)?.id ?? 'top'
  } catch { return 'top' }
}

export function WorkspaceToolbar({ preferenceKey, controls, children }: { preferenceKey: string; controls: ReactNode; children: ReactNode }) {
  const [dock, setDock] = useState(() => readDock(preferenceKey))
  const [dragging, setDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<ToolbarDock | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsId = useId()
  const grip = useRef<HTMLButtonElement>(null)

  const chooseDock = (position: ToolbarDock) => {
    setDock(position)
    try { localStorage.setItem(preferenceKey, position) } catch { /* The toolbar still moves when storage is unavailable. */ }
  }
  const finishDrag = () => { setDragging(false); setDropTarget(null) }
  const closeOptions = () => {
    setOptionsOpen(false)
    grip.current?.focus({ preventScroll: true })
  }

  return <div className="workspace-toolbar-layout" data-toolbar-dock={dock}>
    <div className="workspace-toolbar" role="group" aria-label="Управление видом">
      <div className="workspace-toolbar-handle" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOptionsOpen(false)
      }} onKeyDown={event => {
        if (optionsOpen && event.key === 'Escape') { event.stopPropagation(); closeOptions() }
      }}>
        <Tooltip content="Перетащить панель вида или выбрать край"><Button ref={grip} className="workspace-toolbar-grip" size="sm" variant="quiet" aria-label="Расположение панели вида" draggable aria-expanded={optionsOpen} aria-controls={optionsOpen ? optionsId : undefined} onClick={() => setOptionsOpen(open => !open)} onDragStart={event => {
          event.dataTransfer.setData('text/plain', 'Управление видом')
          event.dataTransfer.effectAllowed = 'move'
          setOptionsOpen(false)
          setDragging(true)
        }} onDragEnd={finishDrag}><GripVertical size={17} aria-hidden="true" /></Button></Tooltip>
        {optionsOpen && <div className="workspace-toolbar-options" role="group" aria-label="Закрепить панель вида" id={optionsId}>
          {positions.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant="quiet" aria-pressed={dock === id} onClick={() => { chooseDock(id); closeOptions() }}><Icon size={16} aria-hidden="true" />{label}</Button>)}
        </div>}
      </div>
      <div className="workspace-toolbar-items">{controls}</div>
    </div>
    <div className="workspace-toolbar-content">{children}</div>
    {dragging && <div className="workspace-toolbar-drop-targets" aria-hidden="true">
      {positions.map(({ id, label, icon: Icon }) => <div key={id} data-dock={id} data-active={dropTarget === id} onDragOver={event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(id)
      }} onDragLeave={() => setDropTarget(null)} onDrop={event => {
        event.preventDefault()
        chooseDock(id)
        finishDrag()
      }}><Icon size={19} />{label}</div>)}
    </div>}
  </div>
}

export function WorkspaceToolbarGroup({ label, end = false, children }: { label: string; end?: boolean; children: ReactNode }) {
  return <div className={`workspace-toolbar-group${end ? ' workspace-toolbar-group--end' : ''}`} role="group" aria-label={label}>{children}</div>
}

const statusIcons = { saved: CircleCheck, dirty: CircleAlert, pending: Clock3, readonly: Lock }

export function WorkspaceToolbarStatus({ state, label }: { state: keyof typeof statusIcons; label: string }) {
  const Icon = statusIcons[state]
  return <Tooltip content={label}><span className="workspace-toolbar-status" data-state={state} tabIndex={0}>
    <Icon size={16} aria-hidden="true" />
    <span className="workspace-toolbar-announcement" role="status">{label}</span>
  </span></Tooltip>
}
