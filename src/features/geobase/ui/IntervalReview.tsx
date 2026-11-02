import { useState, type KeyboardEvent } from 'react'
import { Download, Pencil, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { apParameterFields, createAnomalyRows, createProductiveHorizon, horizonParameterFields, loadAnomalyRows, validateAnomalyRows, type ProductiveHorizon, type ReviewInterval } from '../model/bgdAnomalies'
import { AnomalyLogChart } from './AnomalyLogChart'
import './anomalies.css'

export type { ReviewInterval } from '../model/bgdAnomalies'
const fmt = (value: number | null) => value === null ? '—' : value.toLocaleString('ru-RU', { maximumFractionDigits: 5 })
type Editor = { kind: 'ap'; row: ReviewInterval } | { kind: 'horizon'; parentId: string; row: ProductiveHorizon }

/** AP data is local to the selected well; instrument calculations and GIK parsing are outside this screen. */
export function IntervalReview({ wellId, depth, canEdit, onDirtyChange }: { wellId: string; depth: number; canEdit: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const key = `kapgeo.interval-review.v1.anomalies.${wellId}`
  const [rows, setRows] = useState(() => loadAnomalyRows(key, depth))
  const [selected, setSelected] = useState(rows[0]?.id ?? '')
  const [selectedHorizon, setSelectedHorizon] = useState(rows[0]?.horizons[0]?.id ?? '')
  const [baseline, setBaseline] = useState(rows), [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null), [editorError, setEditorError] = useState('')
  const row = rows.find(r => r.id === selected), horizon = row?.horizons.find(h => h.id === selectedHorizon)
  const dirty = JSON.stringify(rows) !== JSON.stringify(baseline)
  const error = validateAnomalyRows(rows, depth)
  const save = async () => {
    if (error) return false
    try { localStorage.setItem(key, JSON.stringify(rows)); setBaseline(rows); setNotice('Пересечения и горизонты сохранены'); return true }
    catch { setNotice('Не удалось сохранить пересечения'); return false }
  }
  useReportUnsavedChanges(dirty, onDirtyChange, { discard: () => setRows(baseline), save })
  function select(id: string) { setSelected(id); setSelectedHorizon(rows.find(r => r.id === id)?.horizons[0]?.id ?? '') }
  function edit(value: Editor) { setEditor(structuredClone(value)); setEditorError('') }
  function patchEditor(value: Partial<Pick<ReviewInterval, 'from' | 'to' | 'horizon'>>) {
    if (!editor) return
    setEditor(editor.kind === 'ap' ? { ...editor, row: { ...editor.row, ...value } } : { ...editor, row: { ...editor.row, ...value } })
    setEditorError('')
  }
  function applyEditor() {
    if (!editor) return
    const draft = editor.kind === 'ap'
      ? rows.some(r => r.id === editor.row.id) ? rows.map(r => r.id === editor.row.id ? editor.row : r) : [...rows, editor.row]
      : rows.map(r => r.id !== editor.parentId ? r : { ...r, horizons: r.horizons.some(h => h.id === editor.row.id) ? r.horizons.map(h => h.id === editor.row.id ? editor.row : h) : [...r.horizons, editor.row] })
    const problem = validateAnomalyRows(draft, depth)
    if (problem) { setEditorError(problem); return }
    setRows(draft); setNotice('')
    if (editor.kind === 'ap') { setSelected(editor.row.id); setSelectedHorizon(editor.row.horizons[0]?.id ?? '') }
    else setSelectedHorizon(editor.row.id)
    setEditor(null)
  }
  const keyboardSelect = (event: KeyboardEvent, action: () => void) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action() } }
  function removeSelection() {
    const remaining = rows.filter(r => r.id !== selected)
    setRows(remaining); setSelected(remaining[0]?.id ?? ''); setSelectedHorizon(remaining[0]?.horizons[0]?.id ?? ''); setNotice('')
  }
  const nextFrom = Math.max(0, ...rows.map(r => r.to))
  return <div className="bgd-ap-workspace">
    <Panel className="bgd-ap-panel" title="АП · Аномальные пересечения" description="Параметры пересечений и привязка к горизонтам" action={<div className="bgd-ap-actions">
      <Button size="sm" variant="secondary" disabled={!canEdit}><Download size={15} />Импорт GIK</Button>
      <Button size="sm" variant="secondary" disabled={!dirty} onClick={() => { setRows(baseline); setSelected(baseline[0]?.id ?? ''); setSelectedHorizon(baseline[0]?.horizons[0]?.id ?? ''); setNotice('Изменения отменены') }}><Undo2 size={15} />Отменить</Button>
      <Button size="sm" disabled={!canEdit || !dirty || !!error} onClick={() => { void save() }}><Save size={15} />Сохранить интервалы</Button>
    </div>}>
      <div className="bgd-ap-table-heading"><div><h3>Аномальные пересечения</h3><span>{rows.length} · глубина скважины {fmt(depth)} м</span></div><div className="bgd-ap-actions">
        <Button size="sm" variant="secondary" disabled={!canEdit || nextFrom >= depth} onClick={() => { const draft = { ...createAnomalyRows(depth)[0]!, id: crypto.randomUUID(), from: nextFrom, to: Math.min(depth, nextFrom + 1) }; draft.horizons = []; edit({ kind: 'ap', row: draft }) }}><Plus size={15} />Добавить пересечение</Button>
        <Button size="sm" variant="secondary" disabled={!canEdit || !row} onClick={() => { if (row) edit({ kind: 'ap', row }) }}><Pencil size={14} />Параметры</Button>
        <Button size="sm" variant="quiet" className="bgd-ap-delete-icon" title="Удалить пересечение" aria-label="Удалить пересечение" disabled={!canEdit || !row} onClick={removeSelection}><Trash2 size={16} /></Button>
      </div></div>
      <div className="bgd-ap-table-scroll" tabIndex={0} role="region" aria-label="Таблица аномальных пересечений · прокрутка по горизонтали">
        <table className="bgd-ap-table" aria-label="Аномальные пересечения"><thead><tr><th>Глубина от, м</th><th>Глубина до, м</th><th>Горизонт</th>{apParameterFields.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>
          {rows.map(r => <tr key={r.id} tabIndex={0} aria-current={r.id === selected ? 'true' : undefined} className={r.id === selected ? 'is-selected' : ''} onClick={() => select(r.id)} onDoubleClick={() => edit({ kind: 'ap', row: r })} onKeyDown={e => keyboardSelect(e, () => select(r.id))}>
            <td>{fmt(r.from)}</td><td>{fmt(r.to)}</td><td>{r.horizon}</td>{apParameterFields.map(([key]) => <td key={key}>{fmt(r.parameters[key])}</td>)}
          </tr>)}
        </tbody></table>
        {!rows.length && <p className="bgd-ap-empty">Пересечений нет. Добавьте первое пересечение.</p>}
      </div>
    </Panel>
    <Panel className="bgd-ap-panel" title="Продуктивный горизонт" description={row ? `Пересечение ${fmt(row.from)}–${fmt(row.to)} м · горизонтов: ${row.horizons.length}` : 'Выберите аномальное пересечение'} action={<div className="bgd-ap-actions">
      <Button size="sm" variant="secondary" disabled={!canEdit || !row} onClick={() => { if (row) edit({ kind: 'horizon', parentId: row.id, row: createProductiveHorizon(row) }) }}><Plus size={15} />Добавить горизонт</Button>
      <Button size="sm" variant="secondary" disabled={!canEdit || !horizon} onClick={() => { if (row && horizon) edit({ kind: 'horizon', parentId: row.id, row: horizon }) }}><Pencil size={14} />Свойства</Button>
      <Button size="sm" variant="quiet" className="bgd-ap-delete-icon" title="Удалить горизонт" aria-label="Удалить горизонт" disabled={!canEdit || !horizon} onClick={() => { if (!row) return; const horizons = row.horizons.filter(h => h.id !== selectedHorizon); setRows(rows.map(r => r.id === row.id ? { ...r, horizons } : r)); setSelectedHorizon(horizons[0]?.id ?? ''); setNotice('') }}><Trash2 size={16} /></Button>
    </div>}>
      <div className="bgd-ap-table-scroll" tabIndex={0} role="region" aria-label="Таблица продуктивных горизонтов · прокрутка по горизонтали">
        <table className="bgd-ap-table bgd-ap-table--horizons" aria-label="Продуктивные горизонты"><thead><tr><th>Глубина от, м</th><th>Глубина до, м</th><th>Горизонт</th><th>Мощность горизонта, м</th>{horizonParameterFields.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>
          {row?.horizons.map(h => <tr key={h.id} tabIndex={0} aria-current={h.id === selectedHorizon ? 'true' : undefined} className={h.id === selectedHorizon ? 'is-selected' : ''} onClick={() => setSelectedHorizon(h.id)} onDoubleClick={() => edit({ kind: 'horizon', parentId: row.id, row: h })} onKeyDown={e => keyboardSelect(e, () => setSelectedHorizon(h.id))}>
            <td>{fmt(h.from)}</td><td>{fmt(h.to)}</td><td>{h.horizon}</td><td>{fmt(h.to - h.from)}</td>{horizonParameterFields.map(([key]) => <td key={key}>{fmt(h.values[key])}</td>)}
          </tr>)}
        </tbody></table>
        {!row?.horizons.length && <p className="bgd-ap-empty">{row ? 'Горизонтов нет. Добавьте горизонт выбранного пересечения.' : 'Выберите пересечение в таблице выше.'}</p>}
      </div>
    </Panel>
    {(notice || error) && <p className={`bgd-ap-notice${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    <Panel className="bgd-ap-panel bgd-ap-panel--chart"><AnomalyLogChart depth={depth} rows={rows} selected={selected} onSelect={select} /></Panel>
    {editor && <WorkspaceDialog title={editor.kind === 'ap' ? 'Параметры аномального пересечения' : 'Свойства продуктивного горизонта'} onClose={() => setEditor(null)} footer={<>{editorError && <p className="bgd-ap-editor__error" role="alert">{editorError}</p>}<Button variant="secondary" onClick={() => setEditor(null)}>Отмена</Button>{canEdit && <Button onClick={applyEditor}><Save size={16} />Применить</Button>}</>}>
      <div className="bgd-ap-editor">
        <p className="bgd-ap-editor__context">{editor.kind === 'ap' ? `Скважина · глубина ${fmt(depth)} м` : `Пересечение ${fmt(row?.from ?? 0)}–${fmt(row?.to ?? 0)} м`}</p>
        <fieldset disabled={!canEdit}>
          <legend>Границы и горизонт</legend>
          <div className="bgd-ap-fields">
            {(['from', 'to'] as const).map((name, i) => <label key={name}>{i ? 'До, м' : 'От, м'}<input type="number" step="any" min="0" max={depth} value={Number.isFinite(editor.row[name]) ? editor.row[name] : ''} onChange={e => patchEditor({ [name]: e.target.valueAsNumber })} /></label>)}
            <label>Горизонт<input maxLength={80} value={editor.row.horizon} onChange={e => patchEditor({ horizon: e.target.value })} /></label>
          </div>
        </fieldset>
        {editor.kind === 'ap' && editor.row.horizons.length > 0 && <fieldset disabled={!canEdit}><legend>Горизонты пересечения</legend><div className="bgd-ap-fields">{editor.row.horizons.map(h => <div key={h.id} className="bgd-ap-horizon-bounds"><strong>{h.horizon}</strong>{(['from', 'to'] as const).map((name, i) => <label key={name}>{`${i ? 'До' : 'От'} горизонта, м`}<input type="number" step="any" value={Number.isFinite(h[name]) ? h[name] : ''} onChange={e => setEditor({ ...editor, row: { ...editor.row, horizons: editor.row.horizons.map(item => item.id === h.id ? { ...item, [name]: e.target.valueAsNumber } : item) } })} /></label>)}</div>)}</div></fieldset>}
        <fieldset disabled={!canEdit}><legend>{editor.kind === 'ap' ? 'Параметры измерения и обработки' : 'Характеристики продуктивного горизонта'}</legend><div className="bgd-ap-fields">
          {editor.kind === 'ap' ? apParameterFields.map(([name, label]) => <label key={name}>{label}<input type="number" step="any" value={editor.row.parameters[name] ?? ''} onChange={e => setEditor({ ...editor, row: { ...editor.row, parameters: { ...editor.row.parameters, [name]: e.target.value === '' ? null : e.target.valueAsNumber } } })} /></label>)
            : horizonParameterFields.map(([name, label]) => <label key={name}>{label}<input type="number" step="any" value={editor.row.values[name] ?? ''} onChange={e => setEditor({ ...editor, row: { ...editor.row, values: { ...editor.row.values, [name]: e.target.value === '' ? null : e.target.valueAsNumber } } })} /></label>)}
        </div></fieldset>
      </div>
    </WorkspaceDialog>}
  </div>
}
