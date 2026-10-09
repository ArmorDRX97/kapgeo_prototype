import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { WellBgdData } from '../../../entities/well/model/types'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type Interval = WellBgdData['geology']['impermeableIntervals'][number]
const columns = [['depthFrom', 'От, м'], ['depthTo', 'До, м']] as const

export function BgdImpermeableIntervals({ intervals, disabled, onChange }: {
  intervals: Interval[]
  disabled: boolean
  onChange: (rows: Interval[]) => void
}) {
  const addRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingFocus.current) return
    const row = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-interval-id]') ?? []).find((item) => item.dataset.intervalId === pendingFocus.current)
    row?.querySelector<HTMLInputElement>('input')?.focus()
    pendingFocus.current = null
  }, [intervals])

  const add = () => {
    const row = { id: `IMP-${crypto.randomUUID()}`, depthFrom: null, depthTo: null }
    pendingFocus.current = row.id
    onChange([...intervals, row])
  }
  const remove = (id: string, index: number) => {
    const remaining = intervals.filter((item) => item.id !== id)
    pendingFocus.current = remaining[Math.min(index, remaining.length - 1)]?.id ?? null
    onChange(remaining)
    if (!remaining.length) addRef.current?.focus()
  }

  return <Panel className="bgd-impermeable-intervals" title="Непроницаемые интервалы по расходометрии" description="Границы каждого добавленного интервала обязательны."
    action={<Button ref={addRef} size="sm" variant="secondary" disabled={disabled} onClick={add}><Plus size={15} />Добавить интервал</Button>}>
    <div className="bgd-drilling-toolbar"><span>Всего: {intervals.length}</span></div>
    {intervals.length ? <div ref={tableRef} className="bgd-drilling-scroll" role="region" aria-label="Таблица непроницаемых интервалов" tabIndex={0}>
      <table className="bgd-drilling-table bgd-impermeable-table" aria-label="Непроницаемые интервалы">
        <thead><tr><th scope="col">№</th>{columns.map(([key, label]) => <th scope="col" key={key}>{label} <em>*</em></th>)}<th scope="col"><span className="sr-only">Удаление</span></th></tr></thead>
        <tbody>{intervals.map((row, index) => <tr key={row.id} data-interval-id={row.id}>
          <th scope="row">{index + 1}</th>
          {columns.map(([key, label]) => <td key={key}><input type="number" step="any" required disabled={disabled} value={row[key] ?? ''} aria-label={`Непроницаемый интервал ${index + 1}: ${label}`}
            onChange={(event) => onChange(intervals.map((item) => item.id === row.id ? { ...item, [key]: event.target.value === '' ? null : Number(event.target.value) } : item))} /></td>)}
          <td><Button size="sm" variant="quiet" className="bgd-drilling-table__remove" disabled={disabled} aria-label={`Удалить непроницаемый интервал ${index + 1}`} title={`Удалить непроницаемый интервал ${index + 1}`} onClick={() => remove(row.id, index)}><Trash2 size={15} /></Button></td>
        </tr>)}</tbody>
      </table>
    </div> : <div className="bgd-well-empty">Непроницаемые интервалы ещё не добавлены.</div>}
  </Panel>
}
