import { useMemo, useState } from 'react'
import { Link, useBlocker } from '@tanstack/react-router'
import { Download, Info, LockKeyhole, Redo2, Save, Undo2 } from 'lucide-react'
import { WellLog, clampRange, visibleWindow } from '@kapgeo/geo-viz/wellog'
import '@kapgeo/geo-viz/styles/wellog.css'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import { alphaMethods, alphaNames, type AlphaDocument, type AlphaPage, type DepthInterval } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import type { UserPersona } from '../../../entities/session/model/types'
import { alphaFingerprint, alphaStale, calculateCaliper, calculateControls, calculateCurrent, calculateElectro, calculateFlow, calculateGamma, calculateMetal, calculateThermal, electroMetrics, gravelSummary, oreMetrics, zadrSummary } from '../../../entities/interpretation/lib/alphaCalculations'
import { moveContact } from '../../../entities/interpretation/lib/commands'
import { alphaRepository, validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'
import { hasPermission } from '../../../shared/auth/permissions'
import { Button } from '../../../shared/ui/Button'
import { DiscardChangesDialog } from '../../../shared/ui/DiscardChangesDialog'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { MethodParameters } from './MethodParameters'
import { CurveOperations } from './CurveOperations'
import { Group, NumberField } from './Fields'
import { ObjectEditor } from './Objects'
import { objectRows, removeObject } from './objectCommands'
import { AlphaResultTable } from './ResultTable'
import { alphaTracks } from './tracks'
import type { AlphaSearch } from './search'
import { AlphaPassport } from './Passport'
import './alpha.css'

const calculators = { gamma: calculateGamma, electro: calculateElectro, current: calculateCurrent, thermal: calculateThermal, metal: calculateMetal, caliper: calculateCaliper, flow: calculateFlow, controls: calculateControls }
export function AlphaWorkbench({ initial, well, persona, page, search, onLocation, onSaved }: { initial: AlphaDocument; well: InterpretationWell; persona: UserPersona | null; page: AlphaPage; search: AlphaSearch; onLocation: (page: AlphaPage, search: AlphaSearch, replace?: boolean) => void; onSaved: (doc: AlphaDocument) => void }) {
  const [doc, setDoc] = useState(initial), [saved, setSaved] = useState(initial), [past, setPast] = useState<AlphaDocument[]>([]), [future, setFuture] = useState<AlphaDocument[]>([])
  const [preview, setPreview] = useState<AlphaDocument | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [filter, setFilter] = useState(''), [help, setHelp] = useState(false), [context, setContext] = useState<string | null>(null)
  const [tool, setTool] = useState<'pan' | 'select' | 'boundary'>('select'), [editRow, setEditRow] = useState<DepthInterval | { id: string; depth: number; label: string } | null>(null)
  const [sidebar, setSidebar] = useState(true), [directory, setDirectory] = useState(true), [pending, setPending] = useState(false)
  const canEdit = hasPermission(persona, 'geology.interpretation.edit') && well.scope === 'interpretation-demo' && well.status === 'draft'
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved), sub = search.sub ?? (page === 'curves' ? 'alpha-gr' : 'result')
  const resultKey = page === 'thermal' && sub === 'projects' ? null : page === 'thermal' && sub === 'induction' ? 'metal' : page in calculators ? page as keyof typeof calculators : null
  const currentPreview = preview && resultKey ? preview[resultKey] : null
  const previewStale = !!currentPreview && alphaFingerprint(well, doc, resultKey!) !== currentPreview.fingerprint
  const range = clampRange([search.from ?? 98, search.to ?? 143], [0, well.depth])
  const shown = preview ?? doc
  const records = useMemo(() => allAlphaRecords(well, doc), [well, doc])
  const tracks = useMemo(() => alphaTracks(well, shown, page, sub, search.selection), [well, shown, page, sub, search.selection])
  const rows = objectRows(doc, page, sub), selected = editRow ?? rows.find(r => r.id === search.selection)
  const blocker = useBlocker({ withResolver: true, disabled: !(dirty || pending || preview), enableBeforeUnload: dirty || pending || !!preview, shouldBlockFn: ({ current, next }) => {
    const sameWell = 'well' in next.search && next.search.well === well.id
    if (sameWell && next.pathname === current.pathname && ('sub' in next.search ? next.search.sub : undefined) === search.sub) return false
    return next.pathname.startsWith('/geology/interpretation/') && sameWell ? pending || !!preview : true
  } })
  const run = (fn: () => void) => { try { setError(''); fn() } catch (e) { setError((e as Error).message) } }
  const commit = (next: AlphaDocument) => {
    if (!canEdit) throw new Error('Результат доступен только для просмотра.')
    validateAlpha(well, next); setPast(p => [...p, doc].slice(-40)); setFuture([]); setDoc(next); setNotice('')
  }
  const update = (next: AlphaDocument) => run(() => commit(next))
  const save = () => {
    if (pending || preview) throw new Error('Примените или отмените незавершённый ввод и предпросмотр.')
    const next = alphaRepository.save(well, doc, saved.revision); setDoc(next); setSaved(next); onSaved(next); setNotice('')
  }
  const location = (patch: Partial<AlphaSearch>) => onLocation(page, { ...search, well: well.id, ...patch }, true)
  const choose = (id: string) => { if (pending && !window.confirm('Отбросить незавершённый ввод объекта?')) return; setEditRow(null); setPending(false); location({ selection: id }) }
  const setRange = (r: [number, number]) => { const next = clampRange(r, [0, well.depth]); location({ from: next[0], to: next[1] }) }
  const calculate = () => run(() => { if (!canEdit || !resultKey) return; if (pending) throw new Error('Завершите ввод объекта.'); const next = structuredClone(doc); next[resultKey] = calculators[resultKey](well, doc) as never; setPreview(next); setNotice('') })
  const undo = (redo = false) => run(() => {
    if (!canEdit || pending || preview) throw new Error('Завершите ввод перед Undo/Redo.')
    const next = redo ? future[0] : past.at(-1); if (!next) return
    if (redo) { setPast(p => [...p, doc]); setFuture(f => f.slice(1)) } else { setPast(p => p.slice(0, -1)); setFuture(f => [doc, ...f]) }
    setDoc({ ...next, revision: saved.revision }); setEditRow(null); setNotice(redo ? 'Действие повторено.' : 'Действие отменено.')
  })
  const dragBoundary = (trackId: string, id: string, edge: 'from' | 'to', depth: number) => run(() => {
    if (!canEdit || pending || preview) return
    const key = trackId === 'oxidation' ? 'oxidation' : trackId === 'sections' ? 'sections' : trackId
    const next = structuredClone(doc), snapped = Math.round(depth * 10) / 10
    if (key === 'current') {
      const current = next.current.rows.find(r => r.id === id); if (!current) return
      if (id === 'actual-filter') next.parameters.current[edge] = snapped
      else if (edge === 'to') next.parameters.current.sumpBottom = snapped
      else next.parameters.current.to = snapped
      next.current = calculateCurrent(well, next)
    } else if (key === 'electro') next.electro.rows = moveContact(next.electro.rows, id, edge, snapped, well.depth).map(r => electroMetrics(well, next, r, r.rock, r.manualKf ? r.kf : undefined))
    else if (key === 'gamma') next.gamma.rows = moveContact(next.gamma.rows, id, edge, snapped, well.depth).map(r => oreMetrics(well, next, r, r.morphology))
    else if (key === 'thermal') next.thermal.rows = moveContact(next.thermal.rows, id, edge, snapped, well.depth)
    else if (key === 'oxidation' || key === 'sections') next[key] = moveContact(next[key], id, edge, snapped, well.depth)
    else return
    commit(next)
  })
  const add = () => { const id = `manual-${page}-${Date.now()}`, from = Math.round((range[0] + (range[1] - range[0]) / 2) * 10) / 10; setEditRow(page === 'thermal' && sub === 'induction' ? { id, depth: from, label: 'Металлическое кольцо' } : { id, from, to: from + 0.5 }); setPending(true) }
  const download = (value: string, type: string, suffix: string) => { const url = URL.createObjectURL(new Blob([value], { type })), a = document.createElement('a'); a.href = url; a.download = `${well.code}-${suffix}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const sourceInfo = records.find(r => tracks.some(t => t.id === r.id))
  return <div className={`alpha-workspace${directory ? '' : ' alpha-workspace--no-directory'}`}>
    {directory && <aside className="alpha-directory" aria-label="Скважины интерпретации"><header><strong>Скважины</strong><Button size="sm" variant="quiet" onClick={() => setDirectory(false)}>Свернуть</Button></header><input aria-label="Поиск скважины интерпретации" placeholder="Быстрый поиск" value={filter} onChange={e => setFilter(e.target.value)} />{interpretationWells.filter(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())).map(w => <Link key={w.id} to="/geology/interpretation/$method" params={{ method: page }} search={{ well: w.id }} aria-current={w.id === well.id ? 'page' : undefined}><span>{w.code}</span>{w.status === 'locked' && <LockKeyhole size={14} aria-label="Зафиксирована" />}<small>{w.label}</small></Link>)}{!interpretationWells.some(w => `${w.code} ${w.label}`.toLowerCase().includes(filter.toLowerCase())) && <p>Ничего не найдено</p>}</aside>}
    <main className="alpha-main"><header className="alpha-header"><div>{!directory && <Button size="sm" variant="quiet" onClick={() => setDirectory(true)}>Скважины</Button>}<strong>{well.code}</strong><span className="alpha-status" role="status">{!canEdit ? 'Только просмотр' : pending || preview ? 'Правки не применены' : dirty ? 'Не сохранено' : saved.revision > 0 ? 'Сохранено' : 'Исходный результат'}</span></div><div><Button size="sm" variant="quiet" aria-label="Экспорт интерпретации JSON" onClick={() => download(JSON.stringify(doc, null, 2), 'application/json', 'interpretation.json')}><Download size={16} /></Button><Button size="sm" variant="quiet" aria-label="Отменить действие интерпретации" disabled={!canEdit || !past.length || pending || !!preview} onClick={() => undo()}><Undo2 size={16} /></Button><Button size="sm" variant="quiet" aria-label="Повторить действие интерпретации" disabled={!canEdit || !future.length || pending || !!preview} onClick={() => undo(true)}><Redo2 size={16} /></Button><Button size="sm" disabled={!canEdit || !dirty || pending || !!preview} onClick={() => run(save)}><Save size={16} />Сохранить</Button></div></header>
      <nav className="alpha-methods" aria-label="Методы интерпретации">{alphaMethods.map(method => <Link key={method} to="/geology/interpretation/$method" params={{ method }} search={{ well: well.id }} aria-current={page === method ? 'page' : undefined}>{alphaNames[method]}</Link>)}</nav>
      <div className="alpha-title"><h1>{alphaNames[page]}</h1><div><details className="alpha-utilities"><summary>Дополнительно</summary><nav>{(['controls', 'curves', 'passport'] as const).map(method => <Link key={method} to="/geology/interpretation/$method" params={{ method }} search={{ well: well.id }}>{alphaNames[method]}</Link>)}<Link to="/geology/interpretation" search={{ well: well.id, mode: 'core' }}>Керн и пробы</Link></nav></details><Button size="sm" variant="quiet" onClick={() => setHelp(true)}><Info size={16} />Как работать</Button>{page !== 'knd' && <Button size="sm" variant="quiet" onClick={() => setSidebar(v => !v)}>{sidebar ? 'Скрыть инструменты' : 'Инструменты'}</Button>}</div></div>
      {error && <p className="alpha-alert" role="alert">{error}</p>}{notice && <p className="alpha-notice" role="status">{notice}</p>}
      {resultKey && alphaStale(well, doc, resultKey) && <p className="alpha-notice" role="status">Результат устарел: изменены исходная запись, параметры или зависимые построения. Пересчитайте и примените результат.</p>}
      {preview && <div className="alpha-preview"><span>{previewStale ? 'Предпросмотр устарел. Пересчитайте.' : 'Предпросмотр: текущий результат ещё не заменён.'}</span><Button size="sm" disabled={previewStale} onClick={() => run(() => { commit(preview); setPreview(null) })}>Применить результат</Button><Button size="sm" variant="secondary" onClick={() => setPreview(null)}>Отменить предпросмотр</Button></div>}
      {page === 'knd' ? <div className="alpha-placeholder"><h2>КНД-м</h2><p>Метод отложен. В руководстве «Альфа 2018» нет полной методики интерпретации КНД-м.</p><p>Страница подготовлена для следующего этапа.</p></div> : page === 'passport' ? <AlphaPassport well={well} doc={doc} disabled={!canEdit} onChange={update} /> : <>
        {(page === 'thermal' || page === 'gamma') && <nav className="alpha-subviews" aria-label="Представление метода">{(page === 'thermal' ? [['result', 'Термометрия'], ['induction', 'Индукционный каротаж'], ['projects', 'Проектная конструкция']] : [['result', 'Рудные интервалы'], ['oxidation', 'Зона пластового окисления']]).map(([id, title]) => <Button key={id} size="sm" variant={sub === id ? 'primary' : 'quiet'} onClick={() => { setEditRow(null); location({ sub: id, selection: undefined }) }}>{title}</Button>)}</nav>}
        <div className={`alpha-content${sidebar ? '' : ' alpha-content--wide'}`}><section className="alpha-plot"><div className="alpha-plotbar"><div>{(['select', 'pan', 'boundary'] as const).map((id, i) => <Button key={id} size="sm" variant="quiet" aria-pressed={tool === id} onClick={() => setTool(id)}>{['Выбор', 'Перемещение', 'Границы'][i]}</Button>)}</div><div><Button size="sm" variant="quiet" aria-label="Увеличить планшет" onClick={() => setRange(visibleWindow(range, 1.25, (range[0] + range[1]) / 2))}>+</Button><Button size="sm" variant="quiet" aria-label="Уменьшить планшет" onClick={() => setRange(visibleWindow(range, 0.8, (range[0] + range[1]) / 2))}>−</Button><Button size="sm" variant="quiet" onClick={() => setRange([98, 143])}>Вписать</Button></div></div><div className="alpha-range"><NumberField label="Планшет: от, м" value={range[0]} onChange={v => { if (v < range[1]) setRange([v, range[1]]) }} /><NumberField label="Планшет: до, м" value={range[1]} onChange={v => { if (v > range[0]) setRange([range[0], v]) }} /></div>
          {!records.length ? <div className="alpha-placeholder"><h2>Нет записей ГИС</h2><p>Для этой скважины каротажные данные отсутствуют. Выберите другую скважину.</p></div> : <WellLog tracks={tracks} depthRange={range} bounds={[0, well.depth]} height={640} interactionMode={tool} onDepthRangeChange={setRange} onBoundaryChange={dragBoundary} onContextSelect={e => { setContext(`${tracks.find(t => t.id === e.trackId)?.title ?? e.trackId} · глубина ${e.depth.toFixed(2)} м`); const match = rows.find(r => 'from' in r && e.depth >= r.from && e.depth < r.to); if (match) choose(match.id) }} onTrackSelect={e => { const match = rows.find(r => 'depth' in r ? Math.abs(r.depth - e.depth) < 0.3 : e.depth >= r.from && e.depth < r.to); if (match) choose(match.id) }} labels={{ axis: 'MD, м', depthAxis: 'Глубина скважины', unit: 'м', track: 'Колонка' }} />}
          <AlphaResultTable doc={shown} page={page} sub={sub} onSelect={choose} />
        </section>{sidebar && <aside className="alpha-inspector" aria-label="Инструменты интерпретации">
          <Group title="Параметры метода" open><MethodParameters doc={doc} page={page} sub={sub} records={records} onChange={update} disabled={!canEdit || !records.length} />{resultKey && <Button size="sm" disabled={!canEdit || !records.length || pending} onClick={calculate}>{preview ? 'Пересчитать' : page === 'current' ? 'Проверить границы ТК' : 'Рассчитать'}</Button>}{page === 'curves' && <CurveOperations doc={doc} records={records} recordId={sub} depth={well.depth} disabled={!canEdit} onChange={update} onRecord={id => location({ sub: id })} />}</Group>
          {objectRows(doc, page, sub).length > 0 || ['gamma', 'electro', 'thermal', 'flow'].includes(page) ? <Group title="Работа с объектами" open><label className="alpha-field"><span>Объект</span><select value={search.selection ?? ''} onChange={e => choose(e.target.value)}><option value="">Выберите объект</option>{rows.map((r, i) => <option key={r.id} value={r.id}>{i + 1} · {'depth' in r ? r.depth.toFixed(2) : `${r.from.toFixed(2)}–${r.to.toFixed(2)}`} м</option>)}</select></label>{selected && <ObjectEditor key={`${page}-${sub}-${selected.id}-${past.length}`} well={well} doc={doc} page={page} sub={sub} row={selected} onChange={commit} onDirty={() => setPending(true)} disabled={!canEdit || !!preview} onCancel={() => { setEditRow(null); setPending(false); location({ selection: undefined }) }} />}
            <div className="alpha-actions">{page !== 'current' && <Button size="sm" variant="secondary" disabled={!canEdit || !!preview} onClick={add}>Добавить объект</Button>}{selected && page !== 'current' && <Button size="sm" variant="quiet" disabled={!canEdit || !!preview} onClick={() => run(() => { commit(removeObject(doc, page, sub, selected.id)); setEditRow(null); setPending(false); location({ selection: undefined }) })}>Удалить объект</Button>}</div>
          </Group> : null}
          <Group title="Сведения и результаты"><p>{sourceInfo ? `${sourceInfo.name} · ${sourceInfo.unit} · ${sourceInfo.depths.length} точек · ${sourceInfo.operator}` : 'Выберите запись ГИС.'}</p>{resultKey && <p>{shown[resultKey].note}</p>}<MethodSummary well={well} doc={shown} page={page} /><p>Методика: локальный профиль alpha-prototype-1. Исходные записи и коэффициенты сохраняются вместе с результатом.</p><Button size="sm" variant="secondary" onClick={() => download(JSON.stringify(shown[resultKey ?? 'gamma'], null, 2), 'application/json', `${page}-result.json`)}>Экспорт результата</Button></Group>
        </aside>}</div>
      </>}
    </main>
    {help && <WorkspaceDialog title="Управление интерпретацией" onClose={() => setHelp(false)}><p>Колесо — масштаб по глубине. «Перемещение» и ЛКМ — сдвиг планшета. «Границы» — перетаскивание контактов; числовая альтернатива доступна в свойствах объекта. ПКМ — сведения.</p><p>Параметры → Рассчитать → проверить отдельный предпросмотр → Применить результат → Сохранить. Изменение зависимых данных делает результат устаревшим. Undo/Redo относятся ко всему документу.</p><p>ГК и Кф используют локальные модели прототипа; нормативные формулы/поправки требуют независимой проверки. КНД-м отложен.</p></WorkspaceDialog>}
    {context && <WorkspaceDialog title="Сведения об объекте" onClose={() => setContext(null)}><p>{context}</p><p>Точные значения кривых — под планшетом, параметры интервала — в таблице и свойствах.</p></WorkspaceDialog>}
    {blocker.status === 'blocked' && <DiscardChangesDialog error={error} onStay={() => blocker.reset()} onDiscard={() => { setDoc(saved); setPreview(null); setEditRow(null); setPending(false); blocker.proceed() }} onSave={pending || preview ? undefined : () => run(() => { save(); blocker.proceed() })} />}
  </div>
}
function MethodSummary({ well, doc, page }: { well: InterpretationWell; doc: AlphaDocument; page: AlphaPage }) {
  if (page === 'caliper') { let text: string; try { const s = gravelSummary(well, doc); text = `Обсыпка ${s.from.toFixed(2)}–${s.to.toFixed(2)} м · объём ${s.volume.toFixed(4)} м³ · покрытие ${s.covered.toFixed(2)} м.` } catch (e) { text = (e as Error).message } return <p>{text}</p> }
  if (page === 'gamma') { const s = zadrSummary(doc); return s && <p>ЗАДР {s.from.toFixed(2)}–{s.to.toFixed(2)} м · руда {s.ore.toFixed(2)} м · mc {s.metro.toFixed(4)} м·% · охват {(s.coverage * 100).toFixed(1)}%.</p> }
  if (page === 'flow') return <p>Сумма Q: {doc.flow.rows.reduce((s, r) => s + r.rate, 0).toFixed(3)} м³/час.</p>
  return null
}
