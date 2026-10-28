import '../../../features/geology-data/data-workbench.css'
import { BgdSaveBar } from '../../../features/geobase/ui/BgdSaveBar'
import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import { WorkspaceTabs } from '../../../shared/ui/WorkspaceTabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Copy, GitCompareArrows, Layers3, Merge, Plus, Redo2, Scissors, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { GeologicalInterval, Lithology, Well } from '../../../entities/well/model/types'
import type { WellGeologyWorkspace } from '../../../entities/well-geology/model/types'
import { bgdLithologyKinds, findFirstLithologyGap, prepareBgdLithologySave, type BgdLithologyKind } from '../../../features/geobase/model/bgdWellLithology'
import { fetchWellGeologyWorkspace, saveWellGeologyWorkspace } from '../../../repository/api'
import { diffIntervals, validateIntervals } from '../../../shared/scientific/intervals/engine'
import type { IntervalPolicy } from '../../../shared/scientific/intervals/types'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

import { LegendEditor } from '../../../features/geology-data/LegendEditor'
import { readLegend } from '../../../features/geology-data/legend'

const lithologyOptions: Lithology[] = ['Суглинок', 'Песчаник', 'Алевролит', 'Глина', 'Рудный песчаник', 'Песок мелкозернистый', 'Песок среднезернистый', 'Известняк', 'Гравий', 'Мергель']
const mineralizationOptions = ['Отсутствует', 'Слабая', 'Урановая']
const colorOptions = ['Бурый', 'Светло-серый', 'Серый', 'Тёмно-серый', 'Жёлто-бурый']

function sourceFor(kind: BgdLithologyKind): GeologicalInterval['source'] {
  return kind === 'core' ? 'Керн' : kind === 'log' ? 'ГИС' : 'Ручное описание'
}

function formatDepth(value: number) {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
}

function policyFor(depth: number): IntervalPolicy<GeologicalInterval> {
  return { coverage: { from: 0, to: depth }, overlap: 'forbidden', gap: 'warning', minimumThickness: 0.1, snapResolution: 0.1, categoryOf: (interval) => interval.lithology }
}

export function BgdWellLithologyTab({ well, canEdit, activeKind, onKindChange, onDirtyChange }: { well: Well; canEdit: boolean; activeKind?: string; onKindChange?: (kind: string) => void; onDirtyChange?: (dirty: boolean) => void }) {
  const query = useQuery({ queryKey: ['well-geology-v2', well.id], queryFn: () => fetchWellGeologyWorkspace(well.id) })
  if (query.isError) return <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>Не удалось загрузить литологию: {query.error.message}</span></div>
  if (query.isLoading || !query.data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем литологические интервалы…</p></div>
  return <BgdLithologyEditor key={well.id} well={well} canEdit={canEdit} activeKind={activeKind} onKindChange={onKindChange} onDirtyChange={onDirtyChange} initialWorkspace={query.data} />
}

function BgdLithologyEditor({ well, canEdit, initialWorkspace, activeKind, onKindChange, onDirtyChange }: { well: Well; canEdit: boolean; initialWorkspace: WellGeologyWorkspace; activeKind?: string; onKindChange?: (kind: string) => void; onDirtyChange?: (dirty: boolean) => void }) {
  const queryClient = useQueryClient()
  const editorRef = useRef<HTMLElement>(null)
  const openProperties = () => { editorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); editorRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true }) }
  const [legend, setLegend] = useState(readLegend)
  const [internalKind, setKind] = useState<BgdLithologyKind>('core')
  const kind = onKindChange ? activeKind === 'log' || activeKind === 'composite' ? activeKind : 'core' : internalKind
  const [draft, setDraft] = useState<WellGeologyWorkspace | null>(null)
  const [undo, setUndo] = useState<WellGeologyWorkspace[]>([])
  const [redo, setRedo] = useState<WellGeologyWorkspace[]>([])
  const [selectedId, setSelectedId] = useState(initialWorkspace.tracks.find((item) => item.kind === 'core')?.intervals[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const workspace = draft ?? initialWorkspace
  const track = workspace.tracks.find((item) => item.kind === kind)!
  const baselineTrack = initialWorkspace.tracks.find((item) => item.kind === kind)!
  const sorted = useMemo(() => [...track.intervals].sort((first, second) => first.from - second.from), [track.intervals])
  const selectedIndex = sorted.findIndex((item) => item.id === selectedId)
  const selected = sorted[selectedIndex] ?? sorted[0]
  const selectedPosition = selected ? sorted.findIndex((item) => item.id === selected.id) : -1
  const previous = selectedPosition > 0 ? sorted[selectedPosition - 1] : undefined
  const next = selectedPosition >= 0 ? sorted[selectedPosition + 1] : undefined
  const policy = useMemo(() => policyFor(well.depth), [well.depth])
  const issues = useMemo(() => validateIntervals(sorted, policy), [policy, sorted])
  const blockingIssues = useMemo(() => bgdLithologyKinds.flatMap(({ id }) => {
    const candidate = workspace.tracks.find((item) => item.kind === id)
    return candidate ? validateIntervals(candidate.intervals, policy).filter((issue) => issue.severity === 'error') : []
  }), [policy, workspace.tracks])
  const diff = useMemo(() => diffIntervals(baselineTrack.intervals, sorted), [baselineTrack.intervals, sorted])
  const changed = JSON.stringify(initialWorkspace.tracks) !== JSON.stringify(workspace.tracks)
  const availableGap = findFirstLithologyGap(sorted, well.depth)

  const mutation = useMutation({
    mutationFn: () => saveWellGeologyWorkspace(well.id, initialWorkspace, prepareBgdLithologySave(initialWorkspace, workspace), 'geology.bgd.lithology.saved'),
    onSuccess: (nextWorkspace) => {
      queryClient.setQueryData(['well-geology-v2', well.id], nextWorkspace)
      setDraft(null)
      setUndo([])
      setRedo([])
      setSaved(true)
    },
  })

  useReportUnsavedChanges(changed, onDirtyChange, {
    save: async () => { if (!canEdit || blockingIssues.length) return false; await mutation.mutateAsync(); return true },
    discard: () => { setDraft(null); setUndo([]); setRedo([]) },
  })

  const change = (nextWorkspace: WellGeologyWorkspace, focusId = selected?.id ?? '') => {
    if (!canEdit) return
    setUndo((items) => [...items.slice(-39), structuredClone(workspace)])
    setRedo([])
    setDraft(nextWorkspace)
    setSelectedId(focusId)
    setSaved(false)
  }
  const replaceIntervals = (intervals: GeologicalInterval[], focusId?: string) => change({ ...workspace, tracks: workspace.tracks.map((item) => item.id === track.id ? { ...item, intervals } : item) }, focusId)
  const updateSelected = (patch: Partial<GeologicalInterval>) => {
    if (!selected) return
    replaceIntervals(track.intervals.map((item) => item.id === selected.id ? { ...item, ...patch } : item), selected.id)
  }
  const undoChange = () => {
    const previousWorkspace = undo.at(-1)
    if (!previousWorkspace) return
    setRedo((items) => [...items, structuredClone(workspace)])
    setDraft(previousWorkspace)
    setUndo((items) => items.slice(0, -1))
    setSaved(false)
  }
  const redoChange = () => {
    const nextWorkspace = redo.at(-1)
    if (!nextWorkspace) return
    setUndo((items) => [...items, structuredClone(workspace)])
    setDraft(nextWorkspace)
    setRedo((items) => items.slice(0, -1))
    setSaved(false)
  }
  const addInterval = () => {
    if (!availableGap) return
    const above = [...sorted].reverse().find((item) => item.to <= availableGap.from)
    const id = `BGD-LITH-${kind}-${Date.now()}`
    const interval: GeologicalInterval = { id, from: availableGap.from, to: availableGap.to, lithology: above?.lithology ?? 'Песчаник', stratigraphy: above?.stratigraphy ?? 'K2', mineralization: above?.mineralization ?? 'Отсутствует', color: above?.color ?? 'Серый', colorDescription: above?.colorDescription ?? '', description: 'Новый интервал — уточните описание.', source: sourceFor(kind) }
    replaceIntervals([...track.intervals, interval], id)
  }
  const splitInterval = () => {
    if (!selected || selected.to - selected.from < 0.2) return
    const middle = Number(((selected.from + selected.to) / 2).toFixed(1))
    const first = { ...selected, id: `${selected.id}-A${undo.length + 1}`, to: middle }
    const second = { ...selected, id: `${selected.id}-B${undo.length + 1}`, from: middle }
    replaceIntervals(track.intervals.flatMap((item) => item.id === selected.id ? [first, second] : [item]), second.id)
  }
  const mergeInterval = () => {
    if (!selected || !next || Math.abs(selected.to - next.from) > 0.001) return
    const merged = { ...selected, to: next.to, description: `${selected.description} ${next.description}`.trim() }
    replaceIntervals(track.intervals.filter((item) => item.id !== next.id).map((item) => item.id === selected.id ? merged : item), selected.id)
  }
  const copyAbove = () => {
    if (!selected || !previous) return
    updateSelected({ lithology: previous.lithology, stratigraphy: previous.stratigraphy, mineralization: previous.mineralization, color: previous.color, colorDescription: previous.colorDescription, description: previous.description })
  }
  const removeInterval = () => {
    if (!selected) return
    replaceIntervals(track.intervals.filter((item) => item.id !== selected.id), next?.id ?? previous?.id ?? '')
  }
  const selectKind = (nextKind: BgdLithologyKind) => {
    if (onKindChange) onKindChange(nextKind); else setKind(nextKind)
  }

  return <div className="bgd-well-stack bgd-lithology-workspace">
    {saved && <div className="success-banner"><Check size={17} /><span><strong>Литология сохранена</strong>Изменения сохранены.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
    {!canEdit && <div className="form-alert"><Layers3 size={17} /><span>Литологические интервалы доступны только для просмотра.</span></div>}
    <Panel title="Литология и геохимия" description="Выберите вид данных, интервал и его свойства. Легенда содержит демонстрационные обозначения." action={<LegendEditor onChange={() => setLegend(readLegend())} />} />
    <WorkspaceTabs value={kind} onChange={(next) => selectKind(next as BgdLithologyKind)} label="Виды литологических данных" tabs={bgdLithologyKinds.map((item) => ({ id: item.id, label: <>{item.label}<Badge tone="neutral">{workspace.tracks.find((trackItem) => trackItem.kind === item.id)?.intervals.length ?? 0}</Badge></> }))}>
    <div className="data-workbench"><Panel title="Глубинная колонка · литология и геохимия" action={<Button size="sm" variant="secondary" disabled={!selected} onClick={openProperties}>Свойства интервала</Button>} description="Нажмите интервал для точной корректировки границ в свойствах. Геохимический код относится к тем же границам; для смены кода внутри породы разделите интервал."><svg viewBox="0 0 700 360" style={{width:'100%',height:360}} role="img" aria-label="Литологические и геохимические интервалы"><defs><pattern id="bgd-lith-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#4d5360" /></pattern><pattern id="bgd-lith-lines" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 4H8" stroke="#4d5360" /></pattern><pattern id="bgd-lith-diagonal" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#4d5360" /></pattern></defs>{sorted.map(r => { const e=legend.find(e=>e.name===r.lithology), y=20+r.from/well.depth*310, h=(r.to-r.from)/well.depth*310; return <g key={r.id} role="button" tabIndex={0} aria-label={`Выбрать литологию ${r.from}–${r.to}`} onClick={()=>setSelectedId(r.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(r.id)}}}><rect x="90" y={y} width="150" height={h} fill={e?.color??'#ddd'} stroke={r.id===selected?.id?'#194b94':'#8e9aaa'} strokeWidth={r.id===selected?.id?3:1} /><rect x="90" y={y} width="150" height={h} fill={e?.pattern==='none'?'none':`url(#bgd-lith-${e?.pattern??'dots'})`} /><text x="4" y={y+12} fontSize="12">{r.from.toFixed(1)}</text>{h>14&&<text x="250" y={y+13} fontSize="12">{r.lithologyCode??e?.code} · {r.lithology} · геохимия: {r.geochemistryCode||'не задана'}</text>}{r.geochemistryCode&&<rect x="65" y={y} width="18" height={h} fill="url(#bgd-lith-diagonal)" stroke="#64748b"><title>{r.geochemistryCode} · {r.mineralization}</title></rect>}</g>})}</svg><p className="data-note">Левая узкая колонка — наличие геохимического кода. Крап геохимии демонстрационный; целевые обозначения по СТ НАК 16-2026 ожидают таблицу стандарта.</p></Panel></div>
    <div className="bgd-lithology-layout">
      <div className="bgd-lithology-main">
        <Panel title="Интервалы" description={`${bgdLithologyKinds.find((item) => item.id === kind)?.label} · ${track.source}`} action={canEdit ? <div className="bgd-lithology-toolbar"><Button size="sm" variant="quiet" disabled={!undo.length} onClick={undoChange} aria-label="Отменить изменение"><Undo2 size={14} /> Отменить</Button><Button size="sm" variant="quiet" disabled={!redo.length} onClick={redoChange} aria-label="Повторить изменение"><Redo2 size={14} /> Повторить</Button><Button size="sm" variant="secondary" disabled={!availableGap} onClick={addInterval}><Plus size={14} /> Добавить интервал</Button></div> : undefined}>
          <div className="bgd-lithology-table" role="table" aria-label="Интервалы литологии">
            <div className="bgd-lithology-table__head" role="row"><span>Интервал</span><span>Мощность</span><span>Порода</span><span>Минерализация</span><span>Цвет</span></div>
            {sorted.map((item) => <button type="button" role="row" key={item.id} className={selected?.id === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}><span role="cell"><strong>{formatDepth(item.from)}–{formatDepth(item.to)} м</strong><small>{item.source}</small></span><span role="cell">{formatDepth(item.to - item.from)} м</span><span role="cell">{item.lithology}</span><span role="cell">{item.mineralization ?? '—'}</span><span role="cell">{item.color ?? '—'}</span></button>)}
            {!sorted.length && <div className="bgd-core-empty geobase-empty"><Layers3 size={19} /><strong>Интервалов пока нет</strong><span>{canEdit ? 'Добавьте первый интервал.' : 'Данные для этого вида ещё не внесены.'}</span></div>}
          </div>

          {selected && <section ref={editorRef} className="bgd-lithology-editor" aria-label="Редактор литологического интервала">
            <header><span><strong>Интервал {formatDepth(selected.from)}–{formatDepth(selected.to)} м</strong><small>Границы и описание текущего черновика</small></span><Badge tone={kind === 'composite' ? 'warning' : 'info'}>{track.source}</Badge></header>
            <div className="bgd-lithology-form">
              <label className="field"><span className="field__label">Начальная глубина, м</span><input aria-label="Начальная глубина" type="number" step="0.1" disabled={!canEdit} value={selected.from} onChange={(event) => updateSelected({ from: Number(event.target.value) })} /></label>
              <label className="field"><span className="field__label">Конечная глубина, м</span><input aria-label="Конечная глубина" type="number" step="0.1" disabled={!canEdit} value={selected.to} onChange={(event) => updateSelected({ to: Number(event.target.value) })} /></label>
              <label className="field"><span className="field__label">Мощность, м</span><input disabled value={formatDepth(selected.to - selected.from)} /></label>
              <label className="field"><span className="field__label">Порода</span><select aria-label="Порода" disabled={!canEdit} value={selected.lithology} onChange={(event) => updateSelected({ lithology: event.target.value as Lithology, lithologyCode: readLegend().find(r => r.name === event.target.value)?.code })}>{lithologyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span className="field__label">Зернистость</span><select aria-label="Зернистость" disabled={!canEdit} value={selected.grainSize ?? ''} onChange={event => updateSelected({ grainSize: event.target.value })}><option value="">Не указана</option><option>Мелкозернистая</option><option>Среднезернистая</option><option>Крупнозернистая</option><option>Разнозернистая</option></select></label>
              <label className="field"><span className="field__label">Литологический код</span><input disabled={!canEdit} value={selected.lithologyCode ?? readLegend().find(r => r.name === selected.lithology)?.code ?? ""} onChange={e => updateSelected({ lithologyCode: e.target.value })} /></label><label className="field"><span className="field__label">Геохимический код</span><input disabled={!canEdit} placeholder="Код по таблице заказчика" value={selected.geochemistryCode ?? ""} onChange={e => updateSelected({ geochemistryCode: e.target.value })} /></label><label className="field"><span className="field__label">Минерализация</span><select disabled={!canEdit} value={selected.mineralization ?? 'Отсутствует'} onChange={(event) => updateSelected({ mineralization: event.target.value })}>{mineralizationOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span className="field__label">Цвет</span><select disabled={!canEdit} value={selected.color ?? 'Серый'} onChange={(event) => updateSelected({ color: event.target.value })}>{colorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field bgd-lithology-form__description"><span className="field__label">Описание цвета</span><textarea disabled={!canEdit} rows={2} value={selected.colorDescription ?? ''} onChange={(event) => updateSelected({ colorDescription: event.target.value })} /></label>
              <label className="field bgd-lithology-form__description"><span className="field__label">Описание породы</span><textarea disabled={!canEdit} rows={3} value={selected.description} onChange={(event) => updateSelected({ description: event.target.value })} /></label>
            </div>
            {canEdit && <div className="bgd-lithology-editor__actions"><Button size="sm" variant="secondary" onClick={splitInterval}><Scissors size={14} /> Разделить</Button><Button size="sm" variant="secondary" disabled={!next || Math.abs(selected.to - next.from) > 0.001} onClick={mergeInterval}><Merge size={14} /> Объединить со следующим</Button><Button size="sm" variant="quiet" disabled={!previous} onClick={copyAbove}><Copy size={14} /> Скопировать сверху</Button><Button size="sm" variant="quiet" onClick={removeInterval}><Trash2 size={14} /> Удалить</Button></div>}
          </section>}

          {issues.length > 0 && <div className="validation-list" aria-label="Проверка интервалов">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`validation-item validation-item--${issue.severity}`}><AlertTriangle size={15} /><span>{issue.message}</span></div>)}</div>}
        </Panel>

        <Panel title="Изменения" description="Несохранённые изменения"><div className="bgd-lithology-diff"><GitCompareArrows size={19} /><span><strong>{diff.length ? `Изменено интервалов: ${diff.length}` : 'В этих интервалах изменений нет'}</strong><small>{diff.length ? `${diff.filter((item) => item.type === 'added').length} добавлено · ${diff.filter((item) => item.type === 'modified').length} изменено · ${diff.filter((item) => item.type === 'removed').length} удалено` : 'Выберите интервал, чтобы уточнить его описание.'}</small></span>{diff.length > 0 && <Badge tone="warning">Черновик</Badge>}</div></Panel>
      </div>
    </div>

    {canEdit && <BgdSaveBar ready={changed && !blockingIssues.length} status={blockingIssues.length ? `Блокирующих ошибок: ${blockingIssues.length}` : changed ? 'Изменения готовы к сохранению' : 'Нет несохранённых изменений'} pending={mutation.isPending} disabled={!changed || blockingIssues.length > 0} onSave={() => mutation.mutate()} />}
    {mutation.error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{mutation.error.message}</span></div>}
    </WorkspaceTabs>
  </div>
}
