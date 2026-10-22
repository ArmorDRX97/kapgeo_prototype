import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Maximize2, ZoomIn, ZoomOut, MousePointer2, Pencil, ListPlus, Check, X, Unlink } from 'lucide-react'
import { MapLayerToggles } from '../../../entities/geology-map/ui/MapLayerToggles'
import { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import { fitCamera, plotMargin, type Camera, type Size } from '../../../entities/geology-map/geometry'
import type { MapObject, MapProject, XY } from '../../../entities/geology-map/model'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { assignSegmentWell, sectionSegments } from '../../../entities/geology-section/lib/segments'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { profileChangeIssues, profileWithBoundaries } from '../../../entities/geology-section/lib/profileChange'
import { Switch } from '../../../shared/ui/Switch'
import { SegmentRadiusControl } from './SegmentRadiusControl'
import { assignWellToSegment, segmentWellDistance } from '../model/wellAssignment'
import { SegmentWellPicker } from './SegmentWellPicker'
import { segmentRadius } from '../../../entities/geology-section/lib/segmentRadius'
import { Button } from '../../../shared/ui/Button'
import { GraphHelp, PlotSurface, PlotToolbar, ToolCategory } from './SectionGraphicWorkspace'
import { SectionToolButton } from './SectionToolButton'
import { sectionPlan, fromFieldPoint, toFieldPoint, planNumber as number, profileVertexName } from '../model/sectionPlan'

const samePoint = (point: XY) => point
const noop = () => {}
function fitDocumentObject(scene: MapProject, object: MapObject, size: Size): Camera {
  const camera = fitCamera({ ...scene, objects: [object] }, { width: Math.max(200, size.width - plotMargin.left - plotMargin.right), height: Math.max(200, size.height - plotMargin.top - plotMargin.bottom) })
  return { ...camera, x: camera.x + (plotMargin.top - plotMargin.bottom) / (2 * camera.scale), y: camera.y - (plotMargin.left - plotMargin.right) / (2 * camera.scale) }
}
export function SectionMapView({ section, disabled, onChange, onPending, segment: requestedSegment, mapWell, onSegment, onMapWell }: { section: GeologySection; documents: GeologySection[]; disabled: boolean; onChange: (next: GeologySection) => void; onPending: (pending: boolean) => void; segment?: number; mapWell?: string; onSegment?: (index: number) => void; onMapWell?: (id?: string) => void }) {
  const scene = useMemo(() => sectionPlan(section), [section]), profile = scene.objects.find(o => o.kind === 'profile')!
  const [localSegment, setLocalSegment] = useState(0)
  const segments = sectionSegments(section), index = Math.max(0, Math.min(requestedSegment ?? localSegment, segments.length - 1)), active = segments[index]
  const selectSegment = (index: number) => { setLocalSegment(index); onSegment?.(index); setFeedback('') }
  const members = sectionSources(section).filter(w => section.wellIds.includes(w.id)), objects = new Map(scene.objects.map(o => [o.id, o]))
  const container = useRef<HTMLDivElement>(null), fitTarget = useRef<string | null>(mapWell ?? profile.id)
  const focusObject = (id: string) => { const object = objects.get(id); if (!object) return; fitTarget.current = id; const r = container.current?.querySelector('.map-canvas-wrap')?.getBoundingClientRect(); setCamera(fitDocumentObject(scene, object, { width: r?.width ?? 900, height: r?.height ?? 600 })) }
  const [camera, setCamera] = useState<Camera | null>(() => fitDocumentObject(scene, objects.get(mapWell ?? '') ?? profile, { width: 900, height: 600 }))
  const changeCamera = (next: Camera) => { fitTarget.current = null; setCamera(next) }
  useEffect(() => {
    const element = container.current?.querySelector('.map-canvas-wrap')
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const object = scene.objects.find(o => o.id === fitTarget.current)
      if (!object || !entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return
      const next = fitDocumentObject(scene, object, entry.contentRect)
      setCamera(previous => previous && Math.abs(previous.scale - next.scale) < 1e-8 && Math.abs(previous.x - next.x) < 1e-8 && Math.abs(previous.y - next.y) < 1e-8 ? previous : next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [scene])
  const [grid, setGrid] = useState(true), [topography, setTopography] = useState(true), [fund, setFund] = useState(true), [labels, setLabels] = useState(true), [showCorridor, setShowCorridor] = useState(true), [query, setQuery] = useState(''), [localSelected, setLocalSelected] = useState('')
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<MapObject | null>(null), [error, setError] = useState('')
  const [pickingSegmentId, setPickingSegmentId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false), [feedback, setFeedback] = useState('')
  const pending = !!draft || !!pickingSegmentId
  useEffect(() => { onPending(pending); return () => onPending(false) }, [pending, onPending])
  const selected = objects.get(mapWell ?? localSelected), listed = members.filter(w => (!query || w.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && active?.wellIds.includes(w.id))
  const viewScene = useMemo(() => fund ? scene : { ...scene, objects: scene.objects.filter(o => o.kind === 'profile' || section.wellIds.includes(o.id)) }, [fund, scene, section.wellIds])
  const cancel = () => { setDraft(null); setEditing(false); setAssigning(false); setError(''); setFeedback('') }
  const assign = (o: MapObject) => {
    if (disabled || pending || !active || o.kind !== 'well') return
    const distance = segmentWellDistance(section, active.id, fromFieldPoint(o.parts[0]!.nodes[0]!))
    if (distance > segmentRadius(section, active.id) + 1e-7) { setFeedback(`${o.name}: до сегмента ${number(distance)} м. Увеличьте радиус захвата (сейчас ${number(segmentRadius(section, active.id))} м).`); return }
    if (active.wellIds.includes(o.id)) { setFeedback(`${o.name} уже назначена сегменту ${index + 1}.`); return }
    const next = assignWellToSegment(section, active.id, o.id)
    if (next === section) { setFeedback('Не удалось назначить скважину. Выберите её повторно.'); return }
    onChange(next); setFeedback(`${o.name} назначена сегменту ${index + 1}.`)
  }
  const choose = (ids: string[]) => {
    const o = objects.get(ids[0] ?? '')
    if (!o || pending) return
    setLocalSelected(o.id); if (o.kind === 'well') onMapWell?.(o.id)
    if (assigning && o.kind === 'well') assign(o)
  }
  const selectedSegment = selected?.kind === 'well' ? segments.find(s => s.wellIds.includes(selected.id)) : undefined
  const selectedDistance = selected?.kind === 'well' && active ? segmentWellDistance(section, active.id, fromFieldPoint(selected.parts[0]!.nodes[0]!)) : Infinity
  const apply = () => {
    if (!draft) return
    const points = draft.parts[0]!.nodes.map(fromFieldPoint), issues = profileChangeIssues(section, points)
    if (issues.length) { setError(issues.join(' ')); return }
    onChange({ ...profileWithBoundaries(section, points), mapGeometry: undefined }); cancel()
  }
  return <section className="section-field-inspector">
    <h2>Профиль выбранного разреза</h2><p className="section-muted">{section.title}</p><p className="section-muted">1 профиль · {segments.length} сегм. · {members.length} скв. в разрезе</p>
    <label className="section-search">Сегмент профиля<select aria-label="Сегмент профиля" value={index} disabled={pending} onChange={e => { selectSegment(Number(e.target.value)) }}>{segments.map(s => <option key={s.id} value={s.index}>Сегмент {s.index + 1} · {s.wellIds.length} скв.</option>)}</select></label>
    {active && <SegmentRadiusControl section={section} segmentId={active.id} index={index} disabled={disabled || pending} onChange={onChange} />}
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => focusObject(profile.id)}><Crosshair size={15} />К выбранному разрезу</Button>
    {active && <div className="section-map-assignment-actions"><Button size="sm" variant="primary" aria-pressed={assigning} disabled={disabled || pending} onClick={() => { setAssigning(!assigning); setEditing(false); setFeedback(''); setShowCorridor(true); setFund(true) }}>{assigning ? <Check size={15} /> : <ListPlus size={15} />}{assigning ? 'Завершить назначение' : 'Добавлять скважины на карте'}</Button><Button size="sm" variant="quiet" disabled={disabled || pending || editing} onClick={() => setPickingSegmentId(active.id)}>Назначить скважины сегменту</Button></div>}
    <div className="section-field-members"><strong>Скважины сегмента {index + 1} · {active?.wellIds.length ?? 0}</strong><label className="section-search">Поиск в сегменте<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Название скважины" /></label><ul>{listed.map(w => <li key={w.id}><button type="button" disabled={pending} onClick={() => { setLocalSelected(w.id); onMapWell?.(w.id); focusObject(w.id) }}>{w.name}</button></li>)}</ul>{!listed.length && <p className="section-muted">{active?.wellIds.length ? 'Скважины не найдены' : 'Нажмите на скважину в зоне захвата, чтобы назначить её сегменту.'}</p>}</div>
    {selected?.kind === 'well' && <div className="section-field-selection"><strong>{selected.name}</strong><p>{selectedSegment ? `Сегмент ${selectedSegment.index + 1}` : section.wellIds.includes(selected.id) ? 'В разрезе · сегмент не назначен' : 'Ещё не входит в разрез'}</p><p>До сегмента {index + 1}: {number(selectedDistance)} м</p><dl><dt>X, м</dt><dd>{number(selected.parts[0]!.nodes[0]!.x)}</dd><dt>Y, м</dt><dd>{number(selected.parts[0]!.nodes[0]!.y)}</dd><dt>Глубина</dt><dd>{number(selected.attributes.depth)} м</dd></dl>{active && !active.wellIds.includes(selected.id) && <Button size="sm" disabled={disabled || pending || editing || selectedDistance > segmentRadius(section, active.id) + 1e-7} onClick={() => assign(selected)}><ListPlus size={14} />В сегмент {index + 1}</Button>}{selectedSegment && <Button size="sm" variant="secondary" disabled={disabled || pending || editing} onClick={() => { onChange(assignSegmentWell(section, selectedSegment.id, selected.id, false)); setFeedback(`${selected.name} исключена из сегмента. В составе разреза сохранена.`) }}><Unlink size={14} />Исключить из сегмента</Button>}</div>}
    <div className="section-tool-icon-grid"><SectionToolButton label="Выбор объектов" icon={MousePointer2} variant={!editing ? 'primary' : 'secondary'} disabled={pending} onClick={cancel} /><SectionToolButton label="Изменить вершины профиля" icon={Pencil} disabled={disabled || pending} variant={editing ? 'primary' : 'secondary'} onClick={() => { setAssigning(false); setEditing(true); onMapWell?.(undefined); setLocalSelected('') }} /></div>
    {editing && <p className="section-muted">Перетащите вершину профиля. Общая вершина соединяет соседние сегменты.</p>}
    {draft && <div className="section-actions"><Button size="sm" disabled={disabled} onClick={apply}>Применить профиль</Button><Button size="sm" variant="secondary" onClick={cancel}>Отмена</Button></div>}{error && <p role="alert" className="section-error">{error}</p>}
    <ToolCategory category="display"><div className="section-map-switches"><Switch label="Фон: скважины месторождения" description="Остальные скважины вне состава разреза" checked={fund} onChange={setFund} /><Switch label="Подложка OpenTopoMap" checked={topography} onChange={setTopography} /><Switch label="Подписи скважин разреза" checked={labels} onChange={setLabels} /><Switch label="Координатная сетка" checked={grid} onChange={setGrid} /><Switch label="Зона захвата сегмента" description="Полупрозрачная полоса с пунктирной границей" checked={showCorridor} onChange={setShowCorridor} /></div></ToolCategory>
    <ToolCategory category="coordinates">{active && <div className="section-form"><strong>Сегмент {index + 1}</strong><p>От X {number(toFieldPoint(active.a).x)}, Y {number(toFieldPoint(active.a).y)}<br />до X {number(toFieldPoint(active.b).x)}, Y {number(toFieldPoint(active.b).y)}</p></div>}</ToolCategory>
    <PlotToolbar><div className="section-tool-icon-grid"><SectionToolButton label="Приблизить карту" icon={ZoomIn} variant="quiet" onClick={() => camera && changeCamera({ ...camera, scale: Math.min(80, camera.scale * 1.5) })} /><SectionToolButton label="Отдалить карту" icon={ZoomOut} variant="quiet" onClick={() => camera && changeCamera({ ...camera, scale: Math.max(.01, camera.scale / 1.5) })} /><SectionToolButton label="Всё месторождение" icon={Maximize2} variant="quiet" disabled={pending} onClick={() => { fitTarget.current = null; setCamera(null) }} /></div><MapLayerToggles topography={topography} grid={grid} onTopography={setTopography} onGrid={setGrid} /></PlotToolbar>
    <PlotSurface>{assigning && <div className="section-map-assignment-hint"><MousePointer2 size={16} /><span>Сегмент {index + 1}: нажимайте на скважины внутри зоны захвата. Они сразу добавятся в разрез и сегмент.</span><Button size="sm" variant="quiet" aria-label="Завершить назначение на карте" onClick={() => setAssigning(false)}><X size={16} /></Button></div>}{feedback && <p className="section-map-feedback" role="status">{feedback}</p>}<div className="section-field-context"><strong>Только профиль выбранного разреза</strong><span>{segments.length} сегм. · {members.length} скв.</span>{showCorridor && active && <span className="section-corridor-key">Захват ±{number(segmentRadius(section, active.id))} м</span>}<small>{fund ? 'Скважины месторождения — фон' : 'Фон скрыт'}</small></div><div ref={container} className="section-field-map"><MapCanvas segmentAnnotations={segments.map(s => ({ a: draft ? draft.parts[0]!.nodes[s.index]! : toFieldPoint(s.a), b: draft ? draft.parts[0]!.nodes[s.index + 1]! : toFieldPoint(s.b), label: `Сегмент ${s.index + 1}` }))} vertexAnnotations={(draft ? draft.parts[0]!.nodes : section.profile.map(toFieldPoint)).map((point, i) => ({ point, label: profileVertexName(i) }))} onSegmentSelect={!editing ? selectSegment : undefined} corridor={showCorridor && active ? { points: [draft ? draft.parts[0]!.nodes[index]! : toFieldPoint(active.a), draft ? draft.parts[0]!.nodes[index + 1]! : toFieldPoint(active.b)], radius: segmentRadius(section, active.id) } : undefined} highlightWellsOnHover focusWellIds={section.wellIds} topography={topography} project={viewScene} camera={camera} onCamera={changeCamera} selected={editing ? profile.id : selected?.id ?? profile.id} draft={draft} tool="select" editable={!disabled && editing} highlightSegment={!editing && active ? [toFieldPoint(active.a), toFieldPoint(active.b)] : undefined} snap={samePoint} onSelect={choose} onDraft={setDraft} onPoint={noop} onNode={noop} onCancel={cancel} grid={grid} labels={labels} values={false} measure={[]} /></div></PlotSurface>
    <GraphHelp><p>Выберите сегмент по подписи или линии на карте. Нажмите «Добавлять скважины на карте» и нажимайте на скважины в зоне захвата. Каждая сразу включается в разрез и выбранный сегмент; повторное нажатие не создаёт дубль. Назначение переносит её из другого сегмента. Чтобы снять назначение, выберите скважину и нажмите «Исключить из сегмента». Сохранение и отмена действия доступны в шапке разреза.</p></GraphHelp>
    {pickingSegmentId && <SegmentWellPicker section={section} segmentId={pickingSegmentId} onApply={onChange} onClose={() => setPickingSegmentId(null)} />}
  </section>
}
