import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { validateConstruction } from '../../../entities/well-construction/model/validation'
import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import type { ConstructionInterval, Well } from '../../../entities/well/model/types'
import { saveWellConstruction } from '../../../repository/api'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const kinds: ConstructionInterval['element'][] = ['Направление', 'Кондуктор', 'Обсадная колонна', 'Цементировочное кольцо', 'Цементировочный узел', 'Фильтр', 'Отстойник', 'Гравийная обсыпка', 'Бентогильза']
const empty = (): ConstructionInterval => ({ id: crypto.randomUUID(), from: 0, to: 1, diameter: 160, innerDiameter: 124, element: 'Обсадная колонна', material: 'Сталь', note: '' })

export function BgdWellConstructionTab({ well, canEdit, onDirtyChange }: { well: Well; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const client = useQueryClient()
  const saved = useMemo(() => well.construction ?? [], [well.construction])
  const [items, setItems] = useState(saved)
  const [selectedId, setSelectedId] = useState(saved[0]?.id ?? '')
  const [draft, setDraft] = useState<ConstructionInterval>(saved[0] ? { ...saved[0] } : empty())
  const [notice, setNotice] = useState('')
  const dirty = JSON.stringify(items) !== JSON.stringify(saved)
  const mutation = useMutation({ mutationFn: () => saveWellConstruction(well.id, items), onSuccess: async (next) => { client.setQueryData(['well', well.id], next); await client.invalidateQueries({ queryKey: ['wells'] }); setNotice('Конструкция скважины сохранена.') } })
  const select = (item: ConstructionInterval) => { setSelectedId(item.id); setDraft({ ...item }) }
  const add = () => { const item = empty(); setItems((current) => [...current, item]); select(item) }
  const remove = (id: string) => { const next = items.filter((item) => item.id !== id); setItems(next); if (selectedId === id) { const item = next[0]; if (item) select(item); else { setSelectedId(''); setDraft(empty()) } } }
  const update = <K extends keyof ConstructionInterval,>(key: K, value: ConstructionInterval[K]) => { const next = { ...draft, [key]: value }; setDraft(next); setItems((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [...current, next]) }
  const errors = validateConstruction(items, well.depth)
  const discard = () => { setItems(saved); const first = saved[0]; setSelectedId(first?.id ?? ''); setDraft(first ? { ...first } : empty()) }
  useReportUnsavedChanges(dirty, onDirtyChange, { save: async () => { if (errors) return false; await mutation.mutateAsync(); return true }, discard })
  return <div className="bgd-well-construction">
    <Panel title="Конструкция скважины" description="Конструктивные элементы задаются интервалами глубины.">
      <div className="bgd-well-construction__toolbar"><span>{items.length} элементов конструкции</span>{canEdit && <div>
        <Button size="sm" variant="secondary" className="bgd-construction-import" aria-label="Импорт Excel" disabled={mutation.isPending}><FileSpreadsheet size={16} /><span>Импорт</span><span className="bgd-construction-import__format">Excel</span></Button>
        <Button size="sm" variant="secondary" disabled={mutation.isPending}><Download size={16} />Экспорт</Button>
        <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={add}><Plus size={15} /> Добавить</Button>
        <Button size="sm" variant="quiet" disabled={!items.length || mutation.isPending} onClick={() => { setItems([]); setSelectedId(''); setDraft(empty()) }}><Trash2 size={15} /> Удалить все</Button>
      </div>}</div>
      <div className="bgd-well-construction__layout">
        <div className="bgd-well-construction__table-wrap">
          <table className="bgd-well-construction__table">
            <thead><tr><th>Начальная глубина, м</th><th>Конечная глубина, м</th><th>Длина, м</th><th>Тип</th><th>Внешний диаметр, мм</th><th>Внутренний диаметр, мм</th><th>Примечание</th>{canEdit ? <th>Действия</th> : null}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''} tabIndex={0} onClick={() => select(item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(item) } }}>
                  <td>{item.from}</td><td>{item.to}</td><td>{(item.to - item.from).toFixed(1)}</td><td>{item.element}</td><td>{item.diameter}</td><td>{item.innerDiameter ?? '—'}</td><td>{item.note || '—'}</td>
                  {canEdit ? <td><Button size="sm" variant="quiet" disabled={mutation.isPending} aria-label={`Удалить ${item.element}`} onClick={(event) => { event.stopPropagation(); remove(item.id) }}><Trash2 size={15} /></Button></td> : null}
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={canEdit ? 8 : 7}>Конструктивные элементы пока не добавлены.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="bgd-well-construction__editor">
          <h3>{selectedId ? 'Параметры элемента' : 'Новый элемент'}</h3>
          <div className="form-grid bgd-well-form-grid">
            <label className="field"><span className="field__label">Тип</span><select disabled={!canEdit || mutation.isPending} value={draft.element} onChange={(event) => update('element', event.target.value as ConstructionInterval['element'])}>{kinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
            <label className="field"><span className="field__label">Начальная глубина, м</span><input disabled={!canEdit || mutation.isPending} type="number" min="0" step="any" value={draft.from} onChange={(event) => update('from', Number(event.target.value))} /></label>
            <label className="field"><span className="field__label">Конечная глубина, м</span><input disabled={!canEdit || mutation.isPending} type="number" min="0" step="any" value={draft.to} onChange={(event) => update('to', Number(event.target.value))} /></label>
            <label className="field"><span className="field__label">Внешний диаметр, мм</span><input disabled={!canEdit || mutation.isPending} type="number" min="0.1" step="any" value={draft.diameter} onChange={(event) => update('diameter', Number(event.target.value))} /></label>
            <label className="field"><span className="field__label">Внутренний диаметр, мм</span><input disabled={!canEdit || mutation.isPending} type="number" min="0.1" step="any" value={draft.innerDiameter ?? ''} onChange={(event) => update('innerDiameter', event.target.value === '' ? null : Number(event.target.value))} /></label>
            <label className="field"><span className="field__label">Примечание</span><input disabled={!canEdit || mutation.isPending} value={draft.note ?? ''} onChange={(event) => update('note', event.target.value)} /></label>
          </div>
          {errors && <p className="form-alert form-alert--error" role="alert">{errors}</p>}
          {canEdit && <div className="bgd-well-inline-actions"><Button disabled={mutation.isPending || Boolean(errors) || JSON.stringify(items) === JSON.stringify(saved)} onClick={() => mutation.mutate()}><Save size={15} /> Сохранить конструкцию</Button></div>}
          {notice && <p role="status">{notice}</p>}
          {mutation.error && <p role="alert" className="form-alert form-alert--error">{mutation.error.message}</p>}
        </div>
      </div>
      <section className="bgd-well-construction__scheme" aria-label="Схема конструкции скважины">
        <h3>Схема по глубине</h3>
        {items.length ? <svg viewBox="0 0 640 360" role="img" aria-label="Схематический вертикальный разрез конструкции">
          <line x1="130" y1="18" x2="130" y2="340" stroke="var(--border-strong)" />
          {items.map((item, index) => {
            const max = Math.max(well.depth, ...items.map((entry) => entry.to), 1)
            const y = 18 + (item.from / max) * 322
            const height = Math.max(3, ((item.to - item.from) / max) * 322)
            const width = item.diameter / Math.max(...items.map((entry) => entry.diameter), 1) * 160
            return <g key={item.id}>
              <rect x={130 - width / 2} y={y} width={width} height={height} fill={index % 2 ? 'var(--color-brand-100)' : 'var(--surface-subtle)'} stroke="var(--color-brand-600)" />
              <line x1={130 + width / 2} y1={y + height / 2} x2={225} y2={28 + index * 35} stroke="var(--border-strong)" /><text x={230} y={28 + index * 35} fontSize="10" fill="var(--text-secondary)">{item.element} · {item.from}–{item.to} м</text>
            </g>
          })}
        </svg> : <p>Схема появится после добавления конструктивных элементов.</p>}
      </section>
    </Panel>
  </div>
}
