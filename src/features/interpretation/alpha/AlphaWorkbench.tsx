import { ALPHA_CALC_VERSION } from '../../../entities/interpretation/model/alphaVersion'
import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import { Download, Info, LockKeyhole, Redo2, Save, Undo2 } from 'lucide-react'
import { WellLog, clampRange, visibleWindow } from '@kapgeo/geo-viz/wellog'
import '@kapgeo/geo-viz/styles/wellog.css'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import { alphaMethods, alphaNames, type AlphaDocument, type AlphaPage, type DepthInterval } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import type { UserPersona } from '../../../entities/session/model/types'
import { alphaFingerprint, alphaStale, calculateCaliper, calculateControls, calculateCurrent, calculateElectro, calculateFlow, calculateGamma, calculateMetal, calculateThermal, gravelSummary, zadrSummary } from '../../../entities/interpretation/lib/alphaCalculations'
import { changeAlphaContact, fitFilterSections, intervalKey, removeAlphaInterval } from '../../../entities/interpretation/lib/alphaCommands'
import { controlSummary } from '../../../entities/interpretation/lib/alphaControls'
import { electroLevels } from '../../../entities/interpretation/lib/alphaElectro'
import { alphaRepository, validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'
import { hasPermission } from '../../../shared/auth/permissions'
import { Button } from '../../../shared/ui/Button'
import { DiscardChangesDialog } from '../../../shared/ui/DiscardChangesDialog'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { trackContext, resultContext } from './contextInfo'
import { HeaderEditor } from './HeaderEditor'
import { MethodParameters } from './MethodParameters'
import { DisplaySettings } from './DisplaySettings'
import { RecordInspector } from './RecordInspector'
import { MethodActions } from './MethodActions'
import { defaultAlphaView, displayedTracks, loadAlphaViews, saveAlphaViews, type AlphaViewPreferences } from './viewPreferences'
import { CurveOperations } from './CurveOperations'
import { Group, NumberField } from './Fields'
import { ObjectEditor } from './Objects'
import { objectRows, removeObject } from './objectCommands'
import { GammaSummary } from './GammaSummary'
import { AlphaResultTable } from './ResultTable'
import { alphaTracks } from './tracks'
import type { AlphaSearch } from './search'
import { alphaSubview } from './search'
import { alphaExport, resultCsv } from './export'
import { AlphaPassport } from './Passport'
import './alpha.css'

const calculators = { gamma: calculateGamma, electro: calculateElectro, current: calculateCurrent, thermal: calculateThermal, metal: calculateMetal, caliper: calculateCaliper, flow: calculateFlow, controls: calculateControls }
export function AlphaWorkbench({ initial, well, persona, page, search, onLocation, onSaved }: { initial: AlphaDocument; well: InterpretationWell; persona: UserPersona | null; page: AlphaPage; search: AlphaSearch; onLocation: (page: AlphaPage, search: AlphaSearch, replace?: boolean) => void; onSaved: (doc: AlphaDocument) => void }) {
  const [doc, setDoc] = useState(initial), [saved, setSaved] = useState(initial), [past, setPast] = useState<AlphaDocument[]>([]), [future, setFuture] = useState<AlphaDocument[]>([])
  const [preview, setPreview] = useState<AlphaDocument | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [filter, setFilter] = useState(''), [help, setHelp] = useState(false), [context, setContext] = useState<string | null>(null)
  const [tool, setTool] = useState<'pan' | 'select' | 'boundary'>('select'), [editRow, setEditRow] = useState<DepthInterval | { id: string; depth: number; label: string } | null>(null)
  const [sidebar, setSidebar] = useState(true), [directory, setDirectory] = useState(true), [pending, setPending] = useState(false)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [parameterDraft, setParameterDraft] = useState<AlphaDocument | null>(null)
  const [views, setViews] = useState(() => loadAlphaViews(well.id))
  const view = views[page] ?? defaultAlphaView()
  const comparisonWell = page === 'electro' ? interpretationWells.find(w => w.id === view.comparisonWell && w.id !== well.id) : undefined
  const comparison = useQuery({ queryKey: ['alpha-interpretation', comparisonWell?.id], queryFn: () => alphaRepository.load(comparisonWell!), enabled: !!comparisonWell, retry: false })
  const unfinished = pending || !!parameterDraft
  const canEdit = hasPermission(persona, 'geology.interpretation.edit') && well.scope === 'interpretation-demo' && well.status === 'draft'
  const records = useMemo(() => allAlphaRecords(well, doc), [well, doc])
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved), sub = alphaSubview(page, search.sub, records.map(r => r.id))
  const resultKey = page === 'thermal' && sub === 'projects' ? null : page === 'thermal' && sub === 'induction' ? 'metal' : page in calculators ? page as keyof typeof calculators : null
  const currentPreview = preview && resultKey ? preview[resultKey] : null
  const previewStale = !!parameterDraft || !!currentPreview && alphaFingerprint(well, parameterDraft ?? doc, resultKey!) !== currentPreview.fingerprint
  const range = clampRange([search.from ?? 98, search.to ?? 143], [0, well.depth])
  const shown = preview ?? doc
  const rawTracks = useMemo(() => alphaTracks(well, shown, page, sub, search.selection), [well, shown, page, sub, search.selection])
  const tracks = displayedTracks(rawTracks, view, records)
  for (const track of tracks) if (!canEdit || unfinished || preview) track.editable = false
  if (comparisonWell && comparison.data) tracks.push(...alphaTracks(comparisonWell, comparison.data, 'electro', 'result').filter(t => t.curves.length || t.id === 'electro').map(t => ({
    ...t, id: `comparison-${t.id}`, title: `${comparisonWell.code} · ${t.title}`, width: 140, editable: false, grid: view.grid,
    curves: t.curves.map(c => ({ ...c, id: `comparison-${c.id}`, name: `${comparisonWell.code} · ${c.name}`, data: { depths: Array.from(c.data.depths, d => d + view.comparisonOffset), values: c.data.values } })),
    intervals: t.intervals?.map(r => ({ ...r, from: r.from + view.comparisonOffset, to: r.to + view.comparisonOffset })), guides: undefined,
  })))
  const rows = objectRows(shown, page, sub), selected = editRow ?? rows.find(r => r.id === search.selection)
  const blocker = useBlocker({ withResolver: true, disabled: !(dirty || unfinished || preview), enableBeforeUnload: dirty || unfinished || !!preview, shouldBlockFn: ({ current, next }) => {
    const sameWell = ('well' in next.search ? next.search.well ?? 'int-demo-01' : 'int-demo-01') === well.id
    if (sameWell && next.pathname === current.pathname && ('sub' in next.search ? next.search.sub : undefined) === search.sub && (!pending || ('selection' in next.search ? next.search.selection : undefined) === search.selection)) return false
    return next.pathname.startsWith('/geology/interpretation/') && sameWell ? unfinished || !!preview : true
  } })
  const blockedInside = blocker.status === 'blocked' && blocker.next.pathname.startsWith('/geology/interpretation/') && ('well' in blocker.next.search ? blocker.next.search.well ?? 'int-demo-01' : 'int-demo-01') === well.id
  const run = (fn: () => void) => { try { setError(''); fn() } catch (e) { setError((e as Error).message) } }
  const commit = (next: AlphaDocument) => {
    if (!canEdit) throw new Error('Результат доступен только для просмотра.')
    const validated = validateAlpha(well, next)
    if (JSON.stringify(validated) === JSON.stringify(doc)) return
    setPast(p => [...p, doc].slice(-40)); setFuture([]); setDoc(validated); setNotice('')
  }
  const changeView = (next: AlphaViewPreferences) => run(() => { const updated = { ...views, [page]: next }; saveAlphaViews(well.id, updated); setViews(updated) })
  const save = () => {
    if (!canEdit) throw new Error('Результат доступен только для просмотра.')
    if (unfinished || preview) throw new Error('Примените или отмените незавершённый ввод и предпросмотр.')
    const next = alphaRepository.save(well, doc, saved.revision); setDoc(next); setSaved(next); onSaved(next); setNotice('')
  }
  const location = (patch: Partial<AlphaSearch>) => onLocation(page, { ...search, well: well.id, ...patch }, true)
  const closeObject = () => { flushSync(() => { setEditRow(null); setPending(false) }); location({ selection: undefined }) }
  const choose = (id: string) => { const info = resultContext(well.code, shown, page, id); if (info) { setContext(info); return } if (!pending) { setEditRow(null); setPending(false) } location({ selection: id }) }
  const setRange = (r: [number, number]) => { const next = clampRange(r, [0, well.depth]); location({ from: Math.round(next[0] * 1000) / 1000, to: Math.round(next[1] * 1000) / 1000 }) }
  const calculate = () => run(() => {
    if (!canEdit || !resultKey) return
    if (pending) throw new Error('Завершите ввод объекта.')
    const base = validateAlpha(well, parameterDraft ?? doc), next = structuredClone(base)
    next[resultKey] = calculators[resultKey](well, base) as never
    if (parameterDraft) { commit(base); setParameterDraft(null) }
    setPreview(resultKey === 'current' ? fitFilterSections(next) : next); setNotice('')
  })
  const undo = (redo = false) => run(() => {
    if (!canEdit || unfinished || preview) throw new Error('Завершите ввод перед Undo/Redo.')
    const next = redo ? future[0] : past.at(-1); if (!next) return
    if (redo) { setPast(p => [...p, doc]); setFuture(f => f.slice(1)) } else { setPast(p => p.slice(0, -1)); setFuture(f => [doc, ...f]) }
    setDoc({ ...next, revision: saved.revision }); setEditRow(null); setNotice(redo ? 'Действие повторено.' : 'Действие отменено.')
  })
  const dragBoundary = (trackId: string, id: string, edge: 'from' | 'to', depth: number) => run(() => {
    if (!canEdit || unfinished || preview) return
    const key = trackId === 'oxidation' ? 'oxidation' : trackId === 'sections' ? 'sections' : trackId
    const next = structuredClone(doc), snapped = Math.round(depth * 10) / 10
    if (key === 'filter-proposal') {
      const length = next.filterProposal.to - next.filterProposal.from, from = Math.max(0, Math.min(well.depth - length, edge === 'from' ? snapped : snapped - length))
      next.filterProposal = { from, to: from + length }; commit(next); return
    } else if (key === 'current') {
      const current = next.current.rows.find(r => r.id === id); if (!current) return
      if (id === 'actual-filter') next.parameters.current[edge] = snapped
      else if (edge === 'to') next.parameters.current.sumpBottom = snapped
      else next.parameters.current.to = snapped
      next.current = calculateCurrent(well, next)
    } else {
      const editable = intervalKey(key === 'oxidation' ? 'gamma' : key === 'sections' ? 'flow' : key === 'projects' ? 'thermal' : key, key === 'oxidation' ? 'oxidation' : key === 'projects' ? 'projects' : 'result')
      if (!editable) return
      commit(changeAlphaContact(well, doc, editable, id, edge, snapped)); return
    }
    commit(fitFilterSections(next))
  })
  const dragGuide = (_trackId: string, id: string, _axis: 'depth' | 'value', value: number) => run(() => {
    if (!canEdit || unfinished || preview) return
    const next = structuredClone(doc)
    if (page === 'electro' && id.startsWith('level-')) {
      const p = next.parameters.electro, index = Number(id.slice(6)), resolved = electroLevels(well, doc)
      const level = p.levelMode === 'absolute' ? value * p.normalization : value * p.normalization / resolved[index]! * p.levels[index]!
      p.levels[index] = Math.round(level * 100) / 100
      if (p.levels.some((v, i) => v <= 0 || p.levelMode === 'percent' && v >= 100 || i > 0 && v <= p.levels[i - 1]!)) throw new Error('Уровни не должны пересекаться; процентный уровень должен оставаться между 0 и 100.')
    } else if (page === 'current') {
      const [rowId, edge] = id.split(':'); dragBoundary('current', rowId!, edge as 'from' | 'to', value); return
    } else if (page === 'caliper' && id === 'target-diameter') next.parameters.caliper.target = Math.round(value)
    else if (page === 'thermal' && sub === 'induction') {
      next.metal.rows = next.metal.rows.map(r => r.id === id ? { ...r, depth: Math.round(value * 10) / 10 } : r)
      next.metal.fingerprint = alphaFingerprint(well, next, 'metal')
    } else return
    commit(next)
  })
  const add = () => { let index = 1; while (rows.some(r => r.id === `manual-${page}-${index}`)) index++; const id = `manual-${page}-${index}`, from = Math.min(well.depth - 0.5, Math.round((range[0] + (range[1] - range[0]) / 2) * 10) / 10); setEditRow(page === 'thermal' && sub === 'induction' ? { id, depth: from, label: 'Металлическое кольцо' } : { id, from, to: from + 0.5 }); setPending(true) }
  const download = (value: string, type: string, suffix: string) => { const url = URL.createObjectURL(new Blob([value], { type })), a = document.createElement('a'); a.href = url; a.download = `${well.code}-${suffix}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const visibleRecords = records.filter(r => tracks.some(t => t.curves.some(c => c.id === r.id)))
  return <div className={`alpha-workspace${directory ? '' : ' alpha-workspace--no-directory'}`}>
    {directory && <aside className="alpha-directory" aria-label="Скважины интерпретации"><header><strong>Скважины</strong><Button size="sm" variant="quiet" onClick={() => setDirectory(false)}>Свернуть</Button></header><input aria-label="Поиск скважины интерпретации" placeholder="Быстрый поиск" value={filter} onChange={e => setFilter(e.target.value)} />{interpretationWells.filter(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())).map(w => <Link key={w.id} to="/geology/interpretation/$method" params={{ method: page }} search={{ well: w.id, from: range[0], to: range[1], sub: search.sub }} aria-current={w.id === well.id ? 'page' : undefined}><span>{w.code}</span>{w.status === 'locked' && <LockKeyhole size={14} aria-label="Зафиксирована" />}<small>{w.label}</small></Link>)}{!interpretationWells.some(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())) && <p>Ничего не найдено</p>}</aside>}
    <main className="alpha-main"><header className="alpha-header"><div>{!directory && <Button size="sm" variant="quiet" onClick={() => setDirectory(true)}>Скважины</Button>}<strong>{well.code}</strong><Button size="sm" variant="quiet" aria-label="Реквизиты скважины и паспорта" disabled={unfinished || !!preview} onClick={() => setHeaderOpen(true)}><Info size={16} /></Button><span className="alpha-status" role="status">{!canEdit ? 'Только просмотр' : unfinished || preview ? 'Правки не применены' : dirty ? 'Не сохранено' : saved.revision > 0 ? 'Сохранено' : 'Исходный результат'}</span></div><div><Button size="sm" variant="quiet" aria-label="Экспорт интерпретации JSON" onClick={() => download(JSON.stringify(alphaExport(well, doc), null, 2), 'application/json', 'interpretation.json')}><Download size={16} /></Button><Button size="sm" variant="quiet" aria-label="Отменить действие интерпретации" disabled={!canEdit || !past.length || unfinished || !!preview} onClick={() => undo()}><Undo2 size={16} /></Button><Button size="sm" variant="quiet" aria-label="Повторить действие интерпретации" disabled={!canEdit || !future.length || unfinished || !!preview} onClick={() => undo(true)}><Redo2 size={16} /></Button><Button size="sm" disabled={!canEdit || !dirty || unfinished || !!preview} onClick={() => run(save)}><Save size={16} />Сохранить</Button></div></header>
      <nav className="alpha-methods" aria-label="Методы интерпретации">{alphaMethods.map(method => <Link key={method} to="/geology/interpretation/$method" params={{ method }} search={{ well: well.id, from: range[0], to: range[1] }} aria-current={page === method ? 'page' : undefined}>{alphaNames[method]}</Link>)}</nav>
      <div className="alpha-title"><h1>{alphaNames[page]}</h1><div><details className="alpha-utilities"><summary>Дополнительно</summary><nav>{(['controls', 'curves', 'passport'] as const).map(method => <Link key={method} to="/geology/interpretation/$method" params={{ method }} search={{ well: well.id, from: range[0], to: range[1] }}>{alphaNames[method]}</Link>)}<Link to="/geology/interpretation" search={{ well: well.id, mode: 'core', from: range[0], to: range[1] }}>Керн и пробы</Link></nav></details><Button size="sm" variant="quiet" onClick={() => setHelp(true)}><Info size={16} />Как работать</Button>{page !== 'knd' && <Button size="sm" variant="quiet" onClick={() => setSidebar(v => !v)}>{sidebar ? 'Скрыть инструменты' : 'Инструменты'}</Button>}</div></div>
      {search.sub && search.sub !== sub && <p className="alpha-notice" role="status">Неизвестное представление. Показан доступный вид метода. <Button size="sm" variant="quiet" onClick={() => location({ sub, selection: undefined })}>Исправить ссылку</Button></p>}
      {error && <p className="alpha-alert" role="alert">{error}</p>}{notice && <p className="alpha-notice" role="status">{notice}</p>}
      {comparisonWell && comparison.isPending && <p className="alpha-notice">Загрузка соседней скважины…</p>}{comparison.error && <p className="alpha-alert" role="alert">Не удалось открыть соседнюю скважину: {comparison.error.message}</p>}{resultKey && alphaStale(well, doc, resultKey) && <p className="alpha-notice" role="status">Результат устарел: изменены исходная запись, параметры или зависимые построения. Пересчитайте и примените результат.</p>}
      {preview && <div className="alpha-preview"><span>{previewStale ? 'Предпросмотр устарел. Пересчитайте.' : 'Предпросмотр: текущий результат ещё не заменён.'}</span><Button size="sm" disabled={previewStale} onClick={() => run(() => { commit(preview); setPreview(null) })}>Применить результат</Button><Button size="sm" variant="secondary" onClick={() => setPreview(null)}>Отменить предпросмотр</Button></div>}
      {page === 'knd' ? <div className="alpha-placeholder"><h2>КНД-м</h2><p>Метод отложен. В руководстве «Альфа 2018» нет полной методики интерпретации КНД-м.</p><p>Страница подготовлена для следующего этапа.</p></div> : page === 'passport' ? <AlphaPassport key={JSON.stringify(doc.passport)} well={well} doc={doc} disabled={!canEdit} onChange={commit} onPending={setPending} /> : <>
        {(page === 'thermal' || page === 'gamma') && <nav className="alpha-subviews" aria-label="Представление метода">{(page === 'thermal' ? [['result', 'Термометрия'], ['induction', 'Индукционный каротаж'], ['projects', 'Проектная конструкция']] : [['result', 'Рудные интервалы'], ['oxidation', 'Зона пластового окисления']]).map(([id, title]) => <Button key={id} size="sm" variant={sub === id ? 'primary' : 'quiet'} onClick={() => location({ sub: id, selection: undefined })}>{title}</Button>)}</nav>}
        <div className={`alpha-content${sidebar ? '' : ' alpha-content--wide'}`}><section className="alpha-plot"><div className="alpha-plotbar"><div>{(['select', 'pan', 'boundary'] as const).map((id, i) => <Button key={id} size="sm" variant="quiet" aria-pressed={tool === id} disabled={id === 'boundary' && (!canEdit || unfinished || !!preview)} onClick={() => setTool(id)}>{['Выбор', 'Перемещение', 'Границы'][i]}</Button>)}</div><div><Button size="sm" variant="quiet" aria-label="Увеличить планшет" onClick={() => setRange(visibleWindow(range, 1.25, (range[0] + range[1]) / 2))}>+</Button><Button size="sm" variant="quiet" aria-label="Уменьшить планшет" onClick={() => setRange(visibleWindow(range, 0.8, (range[0] + range[1]) / 2))}>−</Button><Button size="sm" variant="quiet" onClick={() => setRange([98, 143])}>Вписать</Button></div></div><div className="alpha-range"><NumberField label="Планшет: от, м" value={range[0]} onChange={v => { if (v < range[1]) setRange([v, range[1]]) }} /><NumberField label="Планшет: до, м" value={range[1]} onChange={v => { if (v > range[0]) setRange([range[0], v]) }} /></div>
          {!records.length ? <div className="alpha-placeholder"><h2>Нет записей ГИС</h2><p>Для этой скважины каротажные данные отсутствуют. Выберите другую скважину.</p></div> : <WellLog tracks={tracks} depthRange={range} bounds={[0, well.depth]} height={640} interactionMode={tool} onDepthRangeChange={setRange} onBoundaryChange={dragBoundary} onGuideChange={canEdit && !unfinished && !preview ? dragGuide : undefined} onContextSelect={e => setContext(trackContext(well.code, tracks, records, e))} onTrackHeaderClick={id => setContext(trackContext(well.code, tracks, records, { trackId: id, depth: (range[0] + range[1]) / 2 }))} onTrackSelect={e => {
            if (page === 'controls') { const pair = shown.controls.rows.find(r => e.trackId === doc.parameters.controls.controlId ? e.depth >= r.controlFrom && e.depth <= r.controlTo : e.depth >= r.from && e.depth <= r.to); if (pair) choose(pair.id); else setContext(trackContext(well.code, tracks, records, e)); return }
            if (page === 'flow' && e.trackId === 'flow') { const bin = shown.flow.rows.find(r => e.depth >= r.from && e.depth <= r.to); if (bin) choose(bin.id); return }
            const owned = intervalKey(page, sub) ?? (page === 'current' ? 'current' : 'metal')
            const activeSource = page === 'thermal' && sub === 'induction' ? doc.parameters.thermal.inductionId : page in doc.parameters ? doc.parameters[page as 'gamma'].recordId : ''
            if (e.trackId !== owned && e.trackId !== activeSource && !(page === 'electro' && ['kf', 'resistivity'].includes(e.trackId))) return
            const match = rows.find(r => 'depth' in r ? Math.abs(r.depth - e.depth) < 0.3 : e.depth >= r.from && e.depth < r.to); if (match) choose(match.id)
          }} labels={{ axis: 'MD, м', depthAxis: 'Глубина скважины', unit: 'м', track: 'Колонка', keyboard: 'Стрелки — глубина; Enter — выбор; Shift+F10 — сведения; плюс/минус — масштаб; Escape — отмена жеста.' }} />}
          <AlphaResultTable doc={shown} page={page} sub={sub} onSelect={choose} />{page === "gamma" && <GammaSummary well={well} doc={shown} disabled={unfinished} />}
        </section>{sidebar && <aside className="alpha-inspector" aria-label="Инструменты интерпретации">
          <Group title="Отображение"><DisplaySettings wellId={well.id} depthLimit={well.depth} tracks={displayedTracks(rawTracks, view, records, true)} records={records} value={view} onChange={changeView} compare={page === "electro"} /></Group><Group title="Параметры метода" open><MethodParameters well={well} doc={parameterDraft ?? doc} page={page} sub={sub} records={records} onChange={setParameterDraft} disabled={!canEdit || !records.length || pending} />{parameterDraft && <div className="alpha-actions"><Button size="sm" variant="secondary" onClick={() => run(() => { commit(parameterDraft); setParameterDraft(null); setPreview(null) })}>Применить параметры</Button><Button size="sm" variant="quiet" onClick={() => setParameterDraft(null)}>Отменить параметры</Button></div>}{resultKey && <Button size="sm" disabled={!canEdit || !records.length || pending} onClick={calculate}>{preview ? 'Пересчитать' : page === 'current' ? 'Проверить границы ТК' : 'Рассчитать'}</Button>}{page === 'curves' && <CurveOperations key={sub} doc={doc} records={records} recordId={sub} well={well} disabled={!canEdit || !records.length} onChange={commit} onPending={setPending} onRecord={id => location({ sub: id })} />}</Group>
          {objectRows(doc, page, sub).length > 0 || ['gamma', 'electro', 'thermal', 'flow'].includes(page) ? <Group title="Работа с объектами" open><label className="alpha-field"><span>Объект</span><select value={search.selection ?? ''} onChange={e => choose(e.target.value)}><option value="">Выберите объект</option>{rows.map((r, i) => <option key={r.id} value={r.id}>{i + 1} · {'depth' in r ? r.depth.toFixed(2) : `${r.from.toFixed(2)}–${r.to.toFixed(2)}`} м</option>)}</select></label>{selected && <ObjectEditor key={`${page}-${sub}-${selected.id}-${past.length}`} well={well} doc={shown} page={page} sub={sub} row={selected} onChange={commit} onDirty={() => setPending(true)} disabled={!canEdit || !!preview || !!parameterDraft} onCancel={closeObject} />}
            <MethodActions page={page} well={well} doc={doc} onChange={commit} disabled={!canEdit || unfinished || !!preview} /><div className="alpha-actions">{page !== 'current' && <Button size="sm" variant="secondary" disabled={!canEdit || pending || !!preview || !!parameterDraft || !records.length && !(page === 'gamma' && sub === 'oxidation' || page === 'thermal' && sub === 'projects')} onClick={add}>Добавить объект</Button>}{selected && page !== 'current' && <Button size="sm" variant="quiet" disabled={!canEdit || pending || !!preview || !!parameterDraft} onClick={() => run(() => { commit(intervalKey(page, sub) ? removeAlphaInterval(well, doc, intervalKey(page, sub)!, selected.id) : removeObject(doc, page, sub, selected.id)); setEditRow(null); setPending(false); location({ selection: undefined }) })}>Удалить объект</Button>}</div>
          </Group> : null}
          <Group title="Сведения и результаты"><RecordInspector records={visibleRecords.length ? visibleRecords : records} />{resultKey && <><p>Версия результата: {shown[resultKey].version}</p><p>{shown[resultKey].note}</p></>}<MethodSummary well={well} doc={shown} page={page} /><p>Методика: локальный профиль {ALPHA_CALC_VERSION}. Исходные записи и коэффициенты сохраняются вместе с результатом.</p><Button size="sm" variant="secondary" onClick={() => download(JSON.stringify(shown[resultKey ?? 'gamma'], null, 2), 'application/json', `${page}-result.json`)}>Экспорт результата</Button><Button size="sm" variant="secondary" onClick={() => download(resultCsv(well, shown, page, sub), "text/csv;charset=utf-8", `${page}-results.csv`)}>Таблица результатов CSV</Button></Group>
        </aside>}</div>
      </>}
    </main>
    {headerOpen && <HeaderEditor doc={doc} disabled={!canEdit} onChange={commit} onPending={setPending} onClose={() => setHeaderOpen(false)} />}
    {help && <WorkspaceDialog title="Управление интерпретацией" onClose={() => setHelp(false)}><p>Колесо — масштаб по глубине. «Перемещение» и ЛКМ — сдвиг планшета. «Границы» — перетаскивание контактов, меток ИК, уровней КС и целевого диаметра; Escape отменяет незавершённый drag; числовая альтернатива доступна в свойствах объекта. ПКМ / Shift+F10 — сведения. Стрелки меняют глубину курсора, Enter выбирает объект, +/− меняют масштаб.</p><p>Параметры → Рассчитать → проверить отдельный предпросмотр → Применить результат → Сохранить. Изменение зависимых данных делает результат устаревшим. Undo/Redo относятся ко всему документу.</p><p>ГК и Кф используют локальные модели прототипа; нормативные формулы/поправки требуют независимой проверки. КНД-м отложен.</p></WorkspaceDialog>}
    {context && <WorkspaceDialog title="Сведения об объекте" onClose={() => setContext(null)}><p className="alpha-context-text">{context}</p></WorkspaceDialog>}
    {blocker.status === 'blocked' && <DiscardChangesDialog description={blockedInside ? "Будет отменён незавершённый ввод и предпросмотр. Применённые изменения остальных методов сохранятся в рабочем документе этой скважины." : "Переход относится к другой скважине или рабочей области. Сохраните документ либо отбросьте все несохранённые изменения интерпретации этой скважины."} error={error} onStay={() => blocker.reset()} onDiscard={() => { if (!blockedInside) setDoc(saved); setHeaderOpen(false); setParameterDraft(null); setPreview(null); setEditRow(null); setPending(false); blocker.proceed() }} onSave={!canEdit || unfinished || preview ? undefined : () => run(() => { save(); blocker.proceed() })} />}
  </div>
}
function MethodSummary({ well, doc, page }: { well: InterpretationWell; doc: AlphaDocument; page: AlphaPage }) {
  if (page === 'caliper') { let text: string; try { const s = gravelSummary(well, doc); text = `Обсыпка ${s.from.toFixed(2)}–${s.to.toFixed(2)} м · объём ${s.volume.toFixed(4)} м³ · покрытие ${s.covered.toFixed(2)} м.` } catch (e) { text = (e as Error).message } return <p>{text}</p> }
  if (page === 'gamma') { const s = zadrSummary(doc, well.depth); return s && <p>ЗАДР {s.from.toFixed(2)}–{s.to.toFixed(2)} м · руда {s.ore.toFixed(2)} м · mc {s.metro.toFixed(4)} м·% · охват {(s.filterCoverage * 100).toFixed(1)}%.</p> }
  if (page === 'controls') { const s = controlSummary(doc.controls.rows); return <p>Пар: {s.count} · сопоставлено {s.matched} · превышений {s.failed} · без пары {s.unmatched}. Среднее расхождение {s.mean?.toFixed(2) ?? '—'}% · СКЗ {s.rms?.toFixed(2) ?? '—'}%. Итог: {s.status === 'pass' ? 'в пределах заданных допусков' : s.status === 'fail' ? 'есть превышения' : 'сравнение неполно'}.</p> }
  if (page === 'flow') return <p>Сумма Q: {doc.flow.rows.reduce((s, r) => s + r.rate, 0).toFixed(3)} м³/час.</p>
  return null
}
