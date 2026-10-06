import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { WellBgdData } from '../../../entities/well/model/types'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type Interval = WellBgdData['drilling']['intervals'][number]
const batchSizes = [1, 5, 10, 20] as const
const numericColumns = [['drillingDiameter', 'Диаметр, мм'], ['depthFrom', 'От, м'], ['depthTo', 'До, м']] as const
const selectColumns = [
  { key: 'drillingTool', label: 'Породоразрушающий инструмент', options: ['Трёхшарошечное долото', 'Алмазная коронка', 'PDC-долото'] },
  { key: 'flushingAgent', label: 'Очистной агент', options: ['Полимерно-глинистый', 'Сульфанол', 'Техническая вода'] },
] as const
const isEmpty = (row: Interval) => row.drillingDiameter === null && row.depthFrom === null && row.depthTo === null && !row.drillingTool && !row.flushingAgent

export function BgdDrillingIntervals({ intervals, disabled, onChange }: {
  intervals: Interval[]; disabled: boolean; onChange: (rows: Interval[]) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const menuId = useId()
  const popupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const nextId = useRef(1)
  const emptyCount = intervals.filter(isEmpty).length

  useEffect(() => {
    if (!menuOpen) return
    popupRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [menuOpen])

  useEffect(() => {
    const targetId = pendingFocus.current
    if (!targetId) return
    const row = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-interval-id]') ?? []).find((item) => item.dataset.intervalId === targetId)
    row?.querySelector<HTMLInputElement>('input')?.focus()
    pendingFocus.current = null
  }, [intervals])

  const addRows = (count: number) => {
    const existingIds = new Set(intervals.map((row) => row.id))
    const added: Interval[] = Array.from({ length: count }, () => {
      let id: string
      do { id = `DRILL-NEW-${nextId.current++}` } while (existingIds.has(id))
      existingIds.add(id)
      return { id, drillingDiameter: null, depthFrom: null, depthTo: null, drillingTool: '', flushingAgent: '' }
    })
    pendingFocus.current = added[0]?.id ?? null
    onChange([...intervals, ...added])
    setMenuOpen(false)
    setAnnouncement(`Добавлено строк: ${count}. Всего интервалов: ${intervals.length + count}.`)
  }

  const updateRow = (id: string, patch: Partial<Interval>) => onChange(intervals.map((row) => row.id === id ? { ...row, ...patch } : row))
  const removeRow = (id: string, index: number) => {
    const remaining = intervals.filter((row) => row.id !== id)
    pendingFocus.current = remaining[Math.min(index, remaining.length - 1)]?.id ?? null
    onChange(remaining)
    if (!remaining.length) triggerRef.current?.focus()
    setAnnouncement(`Интервал ${index + 1} удалён. Всего интервалов: ${remaining.length}.`)
  }

  return <Panel className="bgd-drilling-intervals" title="Интервалы бурения"
    description="Заполните диаметр и границы каждой строки."
    action={<div className="bgd-drilling-add" ref={popupRef}>
      <Button ref={triggerRef} size="sm" variant="secondary" disabled={disabled}
        aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen(!menuOpen)}><Plus size={15} /> Добавить интервалы <ChevronDown size={14} /></Button>
      {menuOpen && <div id={menuId} role="menu" aria-label="Количество новых интервалов" className="bgd-drilling-add__menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); triggerRef.current?.focus() }
          if (event.key === 'Tab') setMenuOpen(false)
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
          const index = items.indexOf(document.activeElement as HTMLButtonElement)
          const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : -1
          if (target >= 0) { event.preventDefault(); items[target]?.focus() }
        }}>
        {batchSizes.map((count) => <button key={count} type="button" role="menuitem" tabIndex={-1} onClick={() => addRows(count)}>
          {count === 1 ? '1 интервал' : `${count} интервалов`}
        </button>)}
      </div>}
    </div>}>
    <div className="bgd-drilling-toolbar">
      <span>Всего: {intervals.length}</span>
      <Button size="sm" variant="quiet" disabled={disabled || !emptyCount} onClick={() => {
        onChange(intervals.filter((row) => !isEmpty(row)))
        triggerRef.current?.focus()
        setAnnouncement(`Удалено пустых строк: ${emptyCount}.`)
      }}><Trash2 size={14} /> Удалить пустые{emptyCount > 0 ? ` (${emptyCount})` : ''}</Button>
    </div>
    <span className="sr-only" role="status">{announcement}</span>
    {intervals.length > 0 ? <div className="bgd-drilling-scroll" ref={tableRef} role="region" aria-label="Таблица интервалов бурения" tabIndex={0}>
      <table className="bgd-drilling-table">
        <thead><tr><th scope="col">№</th>{numericColumns.map(([key, label]) => <th key={key} scope="col">{label} <em>*</em></th>)}{selectColumns.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}<th scope="col"><span className="sr-only">Удаление</span></th></tr></thead>
        <tbody>{intervals.map((row, index) => <tr key={row.id} data-interval-id={row.id}>
          <th scope="row">{index + 1}</th>
          {numericColumns.map(([key, label]) => <td key={key}><input type="number" step="any" required disabled={disabled} value={row[key] ?? ''}
            aria-label={`Интервал ${index + 1}: ${label}`} onChange={(event) => updateRow(row.id, { [key]: event.target.value === '' ? null : Number(event.target.value) })} /></td>)}
          {selectColumns.map(({ key, label, options }) => <td key={key}><select disabled={disabled} value={row[key]}
            aria-label={`Интервал ${index + 1}: ${label}`} onChange={(event) => updateRow(row.id, { [key]: event.target.value })}>
            <option value="">Не выбрано</option>{options.map((option) => <option key={option}>{option}</option>)}
          </select></td>)}
          <td><Button size="sm" variant="quiet" className="bgd-drilling-table__remove" disabled={disabled} aria-label={`Удалить интервал ${index + 1}`} title={`Удалить интервал ${index + 1}`} onClick={() => removeRow(row.id, index)}><Trash2 size={15} /></Button></td>
        </tr>)}</tbody>
      </table>
    </div> : <div className="bgd-well-empty">Интервалы бурения ещё не добавлены.</div>}
  </Panel>
}
