import { useEffect, useMemo, useReducer, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Columns3, Crosshair, FlaskConical, Hand, Layers3, LockKeyhole, Maximize2, PanelLeftClose, PanelLeftOpen, Plus, Redo2, RotateCcw, Save, Search, SlidersHorizontal, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { WellLog, clampRange, visibleWindow, type CurveScale, type DepthRange } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import '@kapgeo/geo-viz/styles/wellog.css'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { calculateTechnology, deleteIntervals, mappedSamples, mergeLithology, moveContact, overwriteInterval, sameLithology, sameTechnology, snapDepth, splitRow } from '../../entities/interpretation/lib/commands'
import { isNoCore, removeSamplePart, resetCoreMapping, sourceIssues, sourceOf, updateSample } from '../../entities/interpretation/lib/core'
import type { CalculationParameters, InterpretationDocument, InterpretationMode, InterpretationWell, LithologyInterval, LithologyKind, SampleKind, TechnologyInterval } from '../../entities/interpretation/model/types'
import type { UserPersona } from '../../entities/session/model/types'
import { interpretationRepository, validateInterpretation } from '../../repository/demo/interpretationRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { interpretationCopy as copy } from './model/copy'
import { historyReducer, sameDocument } from './model/history'
import type { InterpretationSearch } from './model/search'
import { buildTracks, initialView, lithologySpecs, technologySpecs, type Selection, type ViewSettings } from './model/tracks'
import { CalculationEditor, CurveEditor, IntervalEditor } from './ui/Editors'
import { CoreOperationsEditor, RangeDeleteEditor, SampleEditor, type SampleDraft } from './ui/NextEditors'
import { ResultsTable } from './ui/ResultsTable'
import './interpretation.css'

type Row = LithologyInterval | TechnologyInterval
type Preview = { rows: TechnologyInterval[]; parameters: CalculationParameters }
type Tool = 'select' | 'pan' | 'range' | 'boundary'
const tools = { select: Crosshair, pan: Hand, range: Plus, boundary: ArrowDownUp }
function parseSelection(value?: string): Selection {
  if (!value?.includes(':')) return null
  const [trackId, ...parts] = value.split(':')
  return trackId ? { trackId, id: parts.join(':') } : null
}

export function InterpretationWorkbench({ well, initial, persona, search, onLocationChange, onSaved }:
  { well: InterpretationWell; initial: InterpretationDocument; persona: UserPersona | null; search: InterpretationSearch; onLocationChange: (search: InterpretationSearch) => void; onSaved?: (document: InterpretationDocument) => void }) {
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: initial, future: [] })
  const [saved, setSaved] = useState(initial)
  const [kind, setKind] = useState<LithologyKind>('log')
  const [tool, setTool] = useState<Tool>('select')
  const [view, setView] = useState<ViewSettings>(initialView)
  const [scales, setScales] = useState<Record<string, CurveScale>>({})
  const [curveId, setCurveId] = useState<string | null>(null)
  const [calculationOpen, setCalculationOpen] = useState(false)
  const [parameters, setParameters] = useState<CalculationParameters>(initial.calculation ?? { curveId: 'rs-main', from: 112, to: 136, threshold: 25, minThickness: 0.3, method: 'potential', direction: 'down', rounding: 0.1, minImpermeable: 0.3, continuePermeable: false })
  const [sampleKind, setSampleKind] = useState<SampleKind>('KP')
  const [sampleDraft, setSampleDraft] = useState<SampleDraft | null>(null)
  const [rangeDelete, setRangeDelete] = useState(false)
  const [validationOpen, setValidationOpen] = useState(false)
  const [trackWidths, setTrackWidths] = useState<Record<string, number>>({})
  const [trackOrder, setTrackOrder] = useState<string[]>([])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [editPreview, setEditPreview] = useState<Row | null>(null)
  const [newRow, setNewRow] = useState<Row | null>(null)
  const [formDirty, setFormDirty] = useState(false)
  const [editorVersion, setEditorVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(true)
  const [rangeInput, setRangeInput] = useState<DepthRange | null>(null)
  const mode = search.mode ?? 'lithology'
  const range: DepthRange = search.from !== undefined && search.to !== undefined ? [search.from, search.to] : well.initialRange
  const selected = parseSelection(search.selection)
  const doc = history.present
  const canEdit = hasPermission(persona, 'geology.interpretation.edit') && well.scope === 'interpretation-demo' && well.status === 'draft'
  const dirty = !sameDocument(doc, saved)
  const pending = dirty || formDirty || !!newRow || !!preview || !!sampleDraft || rangeDelete
  const coreStale = !!doc.sourceRevision && doc.sourceRevision !== well.sourceRevision
  const inputIssues = useMemo(() => sourceIssues(well), [well])
  const coreEditable = canEdit && !coreStale && !inputIssues.length
  const stale = !!preview && JSON.stringify(parameters) !== JSON.stringify(preview.parameters)
  const rows = kind === 'core' ? well.sourceLithology : kind === 'log' ? doc.logLithology : doc.compositeLithology
  const currentRows: Row[] = mode === 'lithology' ? rows : doc.technology
  const selectedRow = selected?.trackId === 'source' ? (mode === 'technology' ? doc.compositeLithology : well.sourceLithology).find(r => r.id === selected.id) :
    selected?.trackId === 'preview' ? preview?.rows.find(r => r.id === selected.id) : currentRows.find(r => r.id === selected?.id)
  const segment = doc.core.find(s => s.id === selected?.id)
  const selectedSample = selected?.trackId === 'sample' ? mappedSamples(well, doc).find(s => s.id === selected.id) : undefined
  const curve = well.curves.find(c => c.id === curveId)
  const formRow = newRow ?? selectedRow
  const sourceReadonly = selected?.trackId === 'source' || (mode === 'lithology' && kind === 'core')
  const editTrack = mode === 'lithology' ? 'lithology' : 'technology'
  const editableIntervals = canEdit && (mode === 'technology' || (mode === 'lithology' && kind !== 'core'))
  const tracks = useMemo(() => {
    const built = buildTracks(well, doc, mode, kind, parseSelection(search.selection), view, scales, mode === 'core' ? coreEditable : canEdit, preview?.rows, sampleKind)
    if (editPreview && Number.isFinite(editPreview.from) && Number.isFinite(editPreview.to) && editPreview.to > editPreview.from) {
      const target = built.find(t => t.id === (selected?.trackId === 'preview' ? 'preview' : editTrack))
      const spec = 'rock' in editPreview ? lithologySpecs([editPreview], null, '') : technologySpecs([editPreview], null)
      if (target) target.intervals = [...(target.intervals ?? []), ...spec.map(s => ({ ...s, id: 'edit-preview', preview: true, selected: true }))]
    }
    return built.map(t => ({ ...t, width: trackWidths[t.id] ?? t.width })).sort((a, b) => {
      const rank = (id: string) => trackOrder.includes(id) ? trackOrder.indexOf(id) : trackOrder.length + built.findIndex(t => t.id === id)
      return rank(a.id) - rank(b.id)
    })
  }, [well, doc, mode, kind, search.selection, view, scales, canEdit, preview, editPreview, editTrack, selected?.trackId, sampleKind, trackWidths, trackOrder, coreEditable])

  useBlocker({ disabled: !pending, enableBeforeUnload: pending, shouldBlockFn: ({ next }) => {
    if (next.pathname === '/geology' && 'well' in next.search && next.search.well === well.id) return false
    return !window.confirm('Есть несохранённые изменения или предпросмотр. Покинуть интерпретацию и отбросить их?')
  } })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && canEdit) {
        event.preventDefault()
        if ((formDirty || newRow || sampleDraft) && !window.confirm('Отбросить незавершённый ввод интервала?')) return
        setEditPreview(null); setNewRow(null); setSampleDraft(null); setRangeDelete(false); setFormDirty(false); setEditorVersion(v => v + 1)
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); setError('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canEdit, formDirty, newRow, sampleDraft])

  const run = (action: () => void) => { setError(''); try { action() } catch (problem) { setError(problem instanceof Error ? problem.message : copy.storageError) } }
  const closeDraft = () => { setEditPreview(null); setNewRow(null); setSampleDraft(null); setRangeDelete(false); setFormDirty(false); setEditorVersion(v => v + 1) }
  const leaveForm = () => !formDirty && !newRow && !sampleDraft || window.confirm('Отбросить незавершённый ввод интервала?')
  const location = (patch: Partial<InterpretationSearch>) => onLocationChange({ ...search, well: well.id, mode, ...patch })
  const select = (trackId: string, id: string) => {
    if (!leaveForm()) return
    closeDraft(); setCurveId(null); setCalculationOpen(false); setError(''); location({ selection: `${trackId}:${id}` })
  }
  const setRange = (next: DepthRange) => { const adjusted = clampRange(next, [0, well.depth]); location({ from: Number(adjusted[0].toFixed(3)), to: Number(adjusted[1].toFixed(3)) }); setRangeInput(null) }
  const commit = (next: InterpretationDocument, message: string) => {
    if (!canEdit) throw new Error('Результат доступен только для просмотра.')
    validateInterpretation(well, next); dispatch({ type: 'commit', document: next }); closeDraft(); setNotice(message)
  }
  const putRows = (next: Row[]) => mode === 'technology' ? { ...doc, technology: next as TechnologyInterval[] } :
    kind === 'log' ? { ...doc, logLithology: next as LithologyInterval[] } : { ...doc, compositeLithology: next as LithologyInterval[] }
  const applyRow = (next: Row) => run(() => {
    if (!canEdit || sourceReadonly) throw new Error('Исходная колонка доступна только для просмотра.')
    if (selected?.trackId === 'preview' && preview && !('rock' in next)) {
      setPreview({ ...preview, rows: overwriteInterval(preview.rows, next, well.depth, sameTechnology) }); closeDraft(); setNotice('Предпросмотр скорректирован. Примените результат, чтобы перенести его в черновик.'); return
    }
    const result = 'rock' in next ? overwriteInterval(rows, { ...next, color: kind === 'log' ? undefined : next.color }, well.depth, sameLithology) : overwriteInterval(doc.technology, { ...next, source: 'manual' }, well.depth, sameTechnology)
    commit(putRows(result), 'Интервал изменён. Можно отменить действие или сохранить результат.')
    location({ selection: `${editTrack}:${result.find(r => r.from <= next.from && r.to >= next.to)?.id ?? next.id}` })
  })
  const addInterval = (from = snapDepth(range[0] + (range[1] - range[0]) / 3), to = snapDepth(from + 1)) => {
    if (!editableIntervals || !leaveForm()) return
    const id = `${editTrack}-new-${doc.revision}-${history.past.length}-${from}-${to}`
    const previousType = doc.technology.find(r => from >= r.from && from < r.to)?.kind
    const next: Row = mode === 'lithology' ? { id, from, to, rock: 'sand', mineralization: '', minerals: [], note: '' } : { id, from, to, kind: previousType === 'permeable' ? 'impermeable' : 'permeable', source: 'manual' }
    closeDraft(); setNewRow(next); setEditPreview(next); setCurveId(null); setCalculationOpen(false); setTool('select'); setError(''); location({ selection: undefined })
  }
  const changeMode = (next: InterpretationMode) => {
    if (!leaveForm()) return
    closeDraft(); setCurveId(null); setCalculationOpen(false); setTool('select'); setError(''); location({ mode: next, selection: undefined })
  }
  const save = () => run(() => {
    if (!canEdit || formDirty || newRow || preview || sampleDraft || rangeDelete) throw new Error('Сначала примените или отмените ввод и предпросмотр.')
    const result = interpretationRepository.save(well, doc, saved.revision); setSaved(result); onSaved?.(result); setNotice('Демонстрационный результат сохранён в этом браузере.')
  })
  const undo = (type: 'undo' | 'redo') => { if (!leaveForm()) return; closeDraft(); dispatch({ type }); setNotice(type === 'undo' ? 'Действие отменено.' : 'Действие повторено.'); setError('') }
  const reset = () => run(() => {
    if (!canEdit || !window.confirm('Сбросить только интерпретацию этой demo-скважины? БГД и остальные demo-скважины останутся без изменений.')) return
    interpretationRepository.reset(well); const result = structuredClone(well.initial); setSaved(result); onSaved?.(result); dispatch({ type: 'reset', document: result }); closeDraft(); setPreview(null); setNotice('Восстановлен исходный учебный пример. История очищена.'); location({ selection: undefined })
  })
  const calculate = () => run(() => { if (!canEdit) return; const result = calculateTechnology(well, parameters); setPreview({ rows: result, parameters: { ...parameters } }); closeDraft(); setNotice('Предпросмотр рассчитан. Текущие интервалы ещё не изменены.') })
  const applyCalculation = () => run(() => {
    if (!preview || stale || formDirty || newRow) throw new Error('Завершите корректировку и пересчитайте устаревший предпросмотр.')
    if (doc.technology.length && !window.confirm('Заменить все текущие технологические интервалы результатом предпросмотра? Действие можно отменить.')) return
    commit({ ...doc, technology: preview.rows, calculation: preview.parameters }, 'Расчёт перенесён в черновик. Сохраните результат.'); setPreview(null); setCalculationOpen(false); location({ selection: undefined })
  })
  const boundary = (trackId: string, id: string, edge: 'from' | 'to', depth: number) => run(() => {
    if (!editableIntervals || trackId !== editTrack || !leaveForm()) return
    const result = mode === 'lithology' ? moveContact(rows, id, edge, depth, well.depth) : moveContact(doc.technology, id, edge, depth, well.depth).map(r => ({ ...r, source: 'manual' as const }))
    commit(putRows(result), 'Контакт перемещён.'); location({ selection: `${trackId}:${id}` })
  })
  const selectTrackAt = (trackId: string, depth: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (well.curves.some(c => c.id === trackId)) { if (leaveForm()) { closeDraft(); setCurveId(trackId); setCalculationOpen(false) } return }
    const row = track?.intervals?.find(r => depth >= r.from && depth < r.to)
    if (!row || row.id === 'edit-preview') return
    if (mode === 'core' && (trackId === 'samples' || trackId === 'samples-source')) { select('sample', row.id); return }
    if (mode === 'core' && trackId !== 'core') {
      const match = trackId === 'core-source' ? doc.core.find(s => { const source = sourceOf(well, s); return !!source && depth >= source.from && depth < source.to }) :
        trackId === 'samples' ? doc.core.find(s => s.id === mappedSamples(well, doc).find(p => p.id === row.id)?.segmentId) :
        doc.core.find(s => depth >= s.from && depth < s.to)
      if (match) select('core', match.id)
    } else select(trackId, row.id)
  }
  const samples = mappedSamples(well, doc).filter(s => s.kind === sampleKind)
  const tableRows = mode === 'core' ? [...doc.core].sort((a, b) => a.from - b.from) : mode === 'technology' && preview ? preview.rows : currentRows
  const tableTrack = mode === 'core' ? 'core' : mode === 'technology' && preview ? 'preview' : editTrack
  const activeFrom = rangeInput?.[0] ?? Number(range[0].toFixed(1)), activeTo = rangeInput?.[1] ?? Number(range[1].toFixed(1))
  const dirtyText = pending ? 'Есть изменения' : saved.revision > 0 ? 'Сохранено' : 'Исходный пример'
  const coreCommand = (next: () => InterpretationDocument, message: string) => run(() => { if (!coreEditable) throw new Error('Проверьте исходные данные и восстановите устаревшее соответствие.'); commit(next(), message) })
  const rebuildCore = () => run(() => {
    if (!canEdit || !window.confirm('Восстановить соответствие по буровой колонке? Изменения керна, сводных свойств и проб будут сброшены. Операция очистит историю и не поддерживает undo.')) return
    const next = resetCoreMapping(well, doc); validateInterpretation(well, next); dispatch({ type: 'reset', document: next }); closeDraft(); setNotice('Соответствие восстановлено. История очищена; сохраните результат.'); location({ selection: undefined })
  })
  const addSample = (from?: number, to?: number) => {
    if (!coreEditable || !leaveForm()) return
    const s = segment && !isNoCore(segment) && segment.to > segment.from ? segment : doc.core.find(s => !isNoCore(s) && s.to > s.from)
    if (!s) return
    const existing = doc.samples ?? well.samples
    let id = 'demo-sample-new', n = 1
    while (existing.some(sample => sample.id === id)) id = `demo-sample-new-${n++}`
    closeDraft(); setCurveId(null); setCalculationOpen(false); setSampleDraft({ id, name: `DEMO-${copy.sampleKinds[sampleKind]}-NEW`, kind: sampleKind, from: from ?? s.from, to: to ?? Math.min(s.to, s.from + 1) }); location({ selection: undefined })
  }
  const applySample = (value: SampleDraft) => coreCommand(() => {
    const s = selectedSample && doc.core.find(x => x.id === selectedSample.segmentId)
    const next = updateSample(well, doc, { ...value, replacePart: selectedSample && s ? { segmentId: s.sourceId ?? s.id, from: selectedSample.sourceFrom, to: selectedSample.sourceTo } : undefined })
    location({ selection: undefined })
    return next
  }, 'Проба изменена; исходные глубины рассчитаны, лабораторные данные сохранены.')
  const reorderTrack = (id: string, direction: -1 | 1) => {
    const order = tracks.map(t => t.id), i = order.indexOf(id), other = order[i + direction]
    if (!other) return
    order[i] = other; order[i + direction] = id; setTrackOrder(order)
  }

  return <div className="interpretation-page">
    <header className="interpretation-page__header"><div><p className="eyebrow">ГЕОЛОГИЯ / РАБОЧЕЕ МЕСТО</p><h1>Интерпретация</h1><p>Сопоставляйте каротаж, литологию и керн на одном планшете.</p></div><Badge tone="info"><FlaskConical size={14} />{copy.synthetic}</Badge></header>
    <div className={`interpretation-workspace${sidebarOpen ? '' : ' interpretation-workspace--collapsed'}`}>
      {sidebarOpen && <aside className="interpretation-directory" aria-label="Учебный набор скважин">
        <div className="interpretation-directory__title"><span className="interpretation-directory__mark"><Layers3 size={21} /></span><div><strong>Песчаный</strong><small>Учебное месторождение</small></div><Button variant="quiet" size="sm" aria-label="Свернуть список скважин" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17} /></Button></div>
        <p className="interpretation-directory__caption">Отдельный набор интерпретации</p>
        <label className="interpretation-search"><Search size={16} /><input aria-label="Поиск demo-скважины" placeholder="Найти скважину" value={filter} onChange={e => setFilter(e.target.value)} /></label>
        <div className="interpretation-directory__list">{interpretationWells.filter(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())).map(w => <button key={w.id} type="button" aria-current={w.id === well.id ? 'true' : undefined} onClick={() => onLocationChange({ well: w.id, mode })} className={w.id === well.id ? 'is-selected' : ''}><span className="interpretation-well-icon">{w.status === 'locked' ? <LockKeyhole size={16} /> : <Layers3 size={16} />}</span><span><strong>{w.code}</strong><small>{w.label}</small></span><ChevronRight size={15} /></button>)}</div>
        {!interpretationWells.some(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())) && <p className="interpretation-note">Скважины не найдены. Измените поиск.</p>}
        <div className="interpretation-directory__help"><FlaskConical size={18} /><strong>Можно экспериментировать</strong><p>Все числа вымышлены. Изменения этого набора не затрагивают БГД.</p><Button variant="secondary" size="sm" disabled={!canEdit} onClick={reset}><RotateCcw size={14} />Сбросить этот пример</Button></div>
      </aside>}
      <section className="interpretation-main" aria-label="Планшет интерпретации">
        <div className="interpretation-object-header"><div className="interpretation-object-header__identity">{!sidebarOpen && <Button variant="quiet" size="sm" aria-label="Открыть список скважин" onClick={() => setSidebarOpen(true)}><PanelLeftOpen size={18} /></Button>}<span className="interpretation-well-icon"><Layers3 size={20} /></span><div><strong>{well.code}</strong><small>{well.depth} м · {well.curves.length ? 'наборы DEMO-A / DEMO-B' : 'без каротажа'}</small></div></div><div className="interpretation-object-header__actions"><Badge tone={pending ? 'warning' : 'neutral'}>{dirtyText}</Badge><Button size="sm" disabled={!canEdit || !dirty || formDirty || !!newRow || !!preview || !!sampleDraft || rangeDelete} onClick={save}><Save size={15} />Сохранить</Button></div></div>
        <nav className="interpretation-mode-tabs" aria-label="Режимы интерпретации">{(Object.keys(copy.modes) as InterpretationMode[]).map(m => <button type="button" key={m} aria-pressed={mode === m} className={mode === m ? 'is-active' : ''} onClick={() => changeMode(m)}>{m === 'lithology' ? <Layers3 size={16} /> : m === 'technology' ? <SlidersHorizontal size={16} /> : <ArrowDownUp size={16} />}{copy.modes[m]}</button>)}</nav>
        {mode === 'core' && coreStale && <div className="interpretation-preview-banner" role="alert"><div><strong>Исходные данные изменились</strong><small>Соответствие устарело. Восстановите буровую колонку перед редактированием керна.</small></div><Button size="sm" disabled={!canEdit} onClick={rebuildCore}>Восстановить соответствие</Button></div>}
        {mode === 'core' && validationOpen && <div className="interpretation-validation" role="status"><strong>Проверка исходных данных</strong>{inputIssues.length ? <ul>{inputIssues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p>Выход керна, мощности и цвета литологии, промер и исходные пробы согласованы. Проверено {well.runs.length} рейса.</p>}</div>}
        {!canEdit && <div className="interpretation-banner"><LockKeyhole size={16} />{well.status === 'locked' ? 'Зафиксированный пример: доступен просмотр и настройка планшета.' : 'Ваш профиль может просматривать интерпретацию. Изменения доступны геологу и интерпретатору.'}</div>}
        <div className="interpretation-toolbar"><div className="interpretation-toolbar__tools">{(Object.keys(tools) as Tool[]).map(t => { const Icon = tools[t]; return <Button key={t} variant={tool === t ? 'secondary' : 'quiet'} size="sm" aria-label={copy.tools[t]} title={copy.tools[t]} aria-pressed={tool === t} disabled={t === 'range' ? !(editableIntervals || (mode === 'core' && coreEditable)) : t === 'boundary' && !editableIntervals} onClick={() => setTool(t)}><Icon size={17} />{t === 'select' && <span>Выбрать</span>}</Button> })}<span className="interpretation-toolbar__divider" /><Button variant="quiet" size="sm" aria-label="Отменить действие" title="Отменить · Ctrl+Z" disabled={!canEdit || !history.past.length} onClick={() => undo('undo')}><Undo2 size={17} /></Button><Button variant="quiet" size="sm" aria-label="Повторить действие" title="Повторить · Ctrl+Shift+Z" disabled={!canEdit || !history.future.length} onClick={() => undo('redo')}><Redo2 size={17} /></Button></div><div className="interpretation-toolbar__right"><div className="interpretation-columns-wrap"><Button variant="quiet" size="sm" aria-expanded={columnsOpen} onClick={() => setColumnsOpen(v => !v)}><Columns3 size={16} />Колонки</Button>{columnsOpen && <div className="interpretation-columns-popover"><strong>Видимые данные</strong>{(Object.keys(initialView) as (keyof ViewSettings)[]).map(key => <label key={key}><input type="checkbox" checked={view[key]} onChange={e => setView(v => ({ ...v, [key]: e.target.checked }))} />{{ source: 'Исходная колонка', rs: 'КС · основной', gr: 'ГК', control: 'КС · контрольный', measurements: 'Промер керна' }[key]}</label>)}<details><summary>Размер и порядок колонок</summary>{tracks.map(t => <div key={t.id} className="interpretation-track-setting"><label>{t.title}<input aria-label={'Ширина колонки ' + t.title} type="number" min={72} max={360} step={8} value={t.width ?? 140} onChange={e => setTrackWidths(values => ({ ...values, [t.id]: Math.max(72, Math.min(360, Number(e.target.value))) }))} /></label><Button variant="quiet" size="sm" aria-label={'Колонка ' + t.title + ' левее'} onClick={() => reorderTrack(t.id, -1)}><ChevronLeft size={14} /></Button><Button variant="quiet" size="sm" aria-label={'Колонка ' + t.title + ' правее'} onClick={() => reorderTrack(t.id, 1)}><ChevronRight size={14} /></Button></div>)}</details><Button variant="secondary" size="sm" onClick={() => { setView(initialView); setTrackWidths({}); setTrackOrder([]); setScales({}); setNotice('Настройки планшета восстановлены.') }}>Настройки по умолчанию</Button><Button size="sm" variant="quiet" onClick={() => setColumnsOpen(false)}>Готово</Button></div>}</div><Button variant="quiet" size="sm" aria-label="Увеличить масштаб" onClick={() => setRange(visibleWindow(range, 1.4, (range[0] + range[1]) / 2))}><ZoomIn size={17} /></Button><Button variant="quiet" size="sm" aria-label="Уменьшить масштаб" onClick={() => setRange(visibleWindow(range, 1 / 1.4, (range[0] + range[1]) / 2))}><ZoomOut size={17} /></Button><Button variant="quiet" size="sm" aria-label="Показать всю скважину" title="Вся скважина" onClick={() => setRange([0, well.depth])}><Maximize2 size={17} /></Button></div></div>
        <div className="interpretation-context-row">{mode === 'lithology' ? <label>Редактируемые данные<select aria-label="Вид литологии" value={kind} onChange={e => { if (leaveForm()) { closeDraft(); setKind(e.target.value as LithologyKind); setTool('select'); location({ selection: undefined }) } }}>{Object.entries(copy.kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : mode === 'technology' ? <Button variant="secondary" size="sm" disabled={!canEdit || !well.curves.some(c => c.type === 'RS')} onClick={() => { if (leaveForm()) { closeDraft(); setCurveId(null); setCalculationOpen(true) } }}><SlidersHorizontal size={15} />Рассчитать по КС</Button> : <div className="interpretation-core-actions"><label>Вид проб<select aria-label="Показать вид проб" value={sampleKind} onChange={e => { if (leaveForm()) { closeDraft(); setSampleKind(e.target.value as SampleKind); location({ selection: undefined }) } }}>{Object.entries(copy.sampleKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Button size="sm" variant="secondary" disabled={!coreEditable || !well.core.length} onClick={() => addSample()}>Новая сводная проба</Button><Button size="sm" variant="quiet" disabled={!canEdit || !well.core.length} onClick={rebuildCore}>К буровой колонке</Button><Button size="sm" variant="quiet" aria-expanded={validationOpen} onClick={() => setValidationOpen(v => !v)}>Проверить исходные данные</Button></div>}<Button variant="quiet" size="sm" disabled={!editableIntervals} onClick={() => addInterval()}><Plus size={15} />Ввести интервал</Button><Button size="sm" variant="quiet" disabled={!editableIntervals || !!preview} onClick={() => { if (leaveForm()) { closeDraft(); setCurveId(null); setCalculationOpen(false); setRangeDelete(true) } }}>Удалить группу</Button></div>
        <div className="interpretation-range"><span>Окно глубины</span><input aria-label="Окно от, м" type="number" step="0.1" min={0} max={160} value={activeFrom} onChange={e => setRangeInput([Number(e.target.value), activeTo])} /><span>—</span><input aria-label="Окно до, м" type="number" step="0.1" min={0} max={160} value={activeTo} onChange={e => setRangeInput([activeFrom, Number(e.target.value)])} /><span>м</span><Button size="sm" variant="quiet" aria-label="Применить окно глубины" onClick={() => run(() => { if (!Number.isFinite(activeFrom) || !Number.isFinite(activeTo) || activeTo <= activeFrom) throw new Error('Конец окна должен быть глубже начала.'); setRange([activeFrom, activeTo]) })}><Check size={15} /></Button><Button variant="quiet" size="sm" onClick={() => setRange(well.initialRange)}>Рабочий диапазон</Button><span className="interpretation-range__navigation"><Button variant="quiet" size="sm" aria-label="На предыдущий диапазон" onClick={() => setRange([range[0] - (range[1] - range[0]) / 2, range[1] - (range[1] - range[0]) / 2])}><ChevronLeft size={15} /></Button><Button variant="quiet" size="sm" aria-label="На следующий диапазон" onClick={() => setRange([range[0] + (range[1] - range[0]) / 2, range[1] + (range[1] - range[0]) / 2])}><ChevronRight size={15} /></Button></span></div>
        {preview && mode === 'technology' && <div className="interpretation-preview-banner"><div><strong>Предпросмотр · {preview.rows.length} интервалов</strong><small>Текущий результат не изменён. Применение заменит все его интервалы.</small></div><Button size="sm" disabled={!canEdit || stale || formDirty} onClick={applyCalculation}>Применить результат</Button><Button size="sm" variant="quiet" aria-label="Отменить расчёт" onClick={() => { closeDraft(); setPreview(null); setCalculationOpen(false); location({ selection: undefined }); setNotice('Предпросмотр отменён. Текущие интервалы сохранены.') }}><X size={17} /></Button></div>}
        {preview && mode !== 'technology' && <div className="interpretation-preview-banner"><div><strong>Есть предпросмотр технологических интервалов</strong><small>Примените или отмените его перед сохранением.</small></div><Button size="sm" variant="secondary" onClick={() => changeMode('technology')}>К предпросмотру</Button></div>}{!well.curves.length && <div className="interpretation-banner">В этом примере нет каротажа. Ручная разметка доступна; расчёт по КС требует кривую.</div>}
        {mode === 'core' && !well.core.length ? <div className="interpretation-empty"><Layers3 size={36} /><strong>Нет керновых рейсов</strong><p>Выберите DEMO-101, чтобы попробовать привязку керна и перенос проб.</p></div> : <div className="interpretation-canvas"><WellLog tracks={tracks} depthRange={range} bounds={[0, well.depth]} height={600} onDepthRangeChange={setRange} interactionMode={tool} labels={{ axis: 'Глубина, м', depthAxis: 'Шкала глубины', unit: 'м', track: 'Колонка' }} onTrackSelect={event => selectTrackAt(event.trackId, event.depth)} onRangeSelect={(trackId, selectedRange) => { if (mode === 'core' && trackId === 'samples') addSample(snapDepth(selectedRange[0]), snapDepth(selectedRange[1])); else if (trackId === editTrack) addInterval(snapDepth(selectedRange[0]), snapDepth(selectedRange[1])) }} onBoundaryChange={boundary} onTrackHeaderClick={id => { if (well.curves.some(c => c.id === id) && leaveForm()) { closeDraft(); setCurveId(id); setCalculationOpen(false) } }} /></div>}
        <div className="interpretation-hint"><Crosshair size={14} />{mode === 'core' ? 'Выберите сегмент на планшете или в таблице. Исходная колонка остаётся доступна для сравнения.' : copy.hints[tool]}</div>
        <div className="interpretation-legend">{mode === 'technology' ? Object.entries(copy.technology).map(([key, label]) => <span key={key}><i style={{ background: key === 'permeable' ? domainTokens.lithology.sand : key === 'impermeable' ? domainTokens.lithology.clay : domainTokens.lithology.unknown }} />{label}</span>) : Object.entries(copy.rocks).map(([key, label]) => <span key={key}><i style={{ background: domainTokens.lithology[key as keyof typeof domainTokens.lithology] }} />{label}</span>)}<span className="interpretation-legend__note">Условные обозначения demo-набора</span></div>
        {notice && !error && <div className="interpretation-notice" role="status">{notice}</div>}
        <ResultsTable mode={mode} rows={tableRows} samples={samples} selected={selected} well={well} document={doc} preview={!!preview && mode === 'technology'} open={tableOpen} onToggle={() => setTableOpen(v => !v)} onSelect={select} trackId={tableTrack} />
      </section>
      <aside className="interpretation-inspector" aria-label="Свойства и параметры"><header><span><SlidersHorizontal size={16} />{curve ? 'Настройки кривой' : calculationOpen ? 'Интерпретация КС' : 'Свойства'}</span>{(curve || calculationOpen || formRow || segment || sampleDraft || selectedSample || rangeDelete) && <Button variant="quiet" size="sm" aria-label="Закрыть свойства" onClick={() => { if (leaveForm()) { closeDraft(); setCurveId(null); setCalculationOpen(false); location({ selection: undefined }) } }}><X size={16} /></Button>}</header>
        <div className="interpretation-inspector__body">
          {error && <p className="interpretation-notice interpretation-notice--error" role="alert">{error}</p>}
          {rangeDelete ? <RangeDeleteEditor from={range[0]} to={range[1]} rows={currentRows} disabled={!editableIntervals} onDirty={() => setFormDirty(true)} onCancel={closeDraft} onApply={(from, to) => run(() => {
            if (!editableIntervals || !Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to > well.depth || to <= from) throw new Error('Проверьте диапазон удаления.')
            if (!window.confirm('Удалить только полностью попавшие в диапазон интервалы?')) return
            commit(putRows(deleteIntervals(currentRows, from, to, mode === 'technology')), 'Группа удалена. Частично попавшие интервалы сохранены.'); location({ selection: undefined })
          })} /> : curve ? <CurveEditor key={[curve.id, JSON.stringify(scales[curve.id])].join('-')} curve={curve} scale={scales[curve.id] ?? curve.scale} onApply={scale => { setScales(current => ({ ...current, [curve.id]: scale })); setNotice('Шкала кривой изменена.') }} /> : calculationOpen ? <CalculationEditor well={well} parameters={parameters} onChange={setParameters} onCalculate={calculate} disabled={!canEdit} stale={stale} hasPreview={!!preview} /> : mode === 'core' && (sampleDraft || selectedSample) ? <SampleEditor key={[sampleDraft?.id ?? selectedSample?.id, editorVersion].join('-')} draft={sampleDraft ?? { id: selectedSample!.sampleId, name: selectedSample!.name, kind: selectedSample!.kind, from: selectedSample!.from, to: selectedSample!.to }} well={well} document={doc} segmentId={selectedSample?.segmentId} disabled={!coreEditable} onDirty={() => setFormDirty(true)} onApply={applySample} onDelete={selectedSample ? () => coreCommand(() => {
            if (!window.confirm('Удалить выбранную часть пробы? Остальные части и анализы сохранятся.')) return doc
            const s = doc.core.find(x => x.id === selectedSample.segmentId)!
            const result = removeSamplePart(well, doc, selectedSample.sampleId, { segmentId: s.sourceId ?? s.id, from: selectedSample.sourceFrom, to: selectedSample.sourceTo }); location({ selection: undefined }); return result
          }, 'Часть пробы удалена.') : undefined} /> : mode === 'core' && segment ? <CoreOperationsEditor key={[segment.id, JSON.stringify(segment), editorVersion].join('-')} segment={segment} well={well} document={doc} disabled={!coreEditable} onDirty={() => setFormDirty(true)} onCommand={coreCommand} /> : mode !== 'core' && formRow ? <IntervalEditor key={[formRow.id, JSON.stringify(formRow), editorVersion].join('-')} row={formRow} depth={well.depth} well={well} allowColor={mode === 'lithology' && kind !== 'log'} disabled={!canEdit || sourceReadonly} isNew={!!newRow} onApply={applyRow} onPreview={row => { setEditPreview(row); setFormDirty(true) }} onCancel={closeDraft} onSplit={selected?.trackId === 'preview' ? undefined : at => run(() => commit(putRows(splitRow(currentRows, formRow.id, at, well.depth)), 'Интервал разделён.'))} onMerge={mode === 'lithology' ? direction => run(() => { commit(putRows(mergeLithology(rows, formRow.id, direction)), 'Разности объединены со свойствами выбранной.'); location({ selection: 'lithology:' + formRow.id }) }) : undefined} onDelete={selected?.trackId === 'preview' ? undefined : () => run(() => {
            if (!window.confirm(mode === 'technology' ? 'Удалить интервал? Прилегающий сверху заполнит диапазон. Если верхнего нет, останется область без данных.' : 'Удалить выбранную разность?')) return
            commit(putRows(deleteIntervals(currentRows, formRow.from, formRow.to, mode === 'technology')), 'Интервал удалён.'); location({ selection: undefined })
          })} /> : <div className="interpretation-inspector__empty"><Crosshair size={28} /><h2>{mode === 'core' ? 'Выберите сегмент или пробу' : 'Выберите интервал'}</h2><p>Нажмите на колонку планшета или строку реестра. Здесь появятся глубины, свойства и доступные действия.</p>{editableIntervals && <Button variant="secondary" size="sm" onClick={() => addInterval()}><Plus size={15} />Ввести интервал</Button>}</div>}
        </div>
        <footer><FlaskConical size={15} /><span>Изолированный прототип<br />Данные сохраняются в этом браузере</span></footer>
      </aside>
    </div>
  </div>
}
