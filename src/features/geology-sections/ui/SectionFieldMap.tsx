import { useMemo, useRef, useState } from 'react'
import { Crosshair, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { depositField, fieldProfiles, fieldSectionScene } from '../../../entities/geology-map/fieldScene'
import { MapLayerToggles } from '../../../entities/geology-map/ui/MapLayerToggles'
import { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import { MapObjectSearch } from '../../../entities/geology-map/ui/MapObjectSearch'
import { WellTypeFilters } from '../../../entities/geology-map/ui/WellTypeFilters'
import { fitCamera, type Camera } from '../../../entities/geology-map/geometry'
import { mapSegments } from '../../../entities/geology-map/anchors'
import type { XY } from '../../../entities/geology-map/model'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { GraphHelp, PlotSurface, PlotToolbar, ToolCategory } from './SectionGraphicWorkspace'
import { SectionToolButton } from './SectionToolButton'
import { ProfileMap } from './ProfileMap'

const fieldScene = fieldSectionScene()
const objectsById = new Map(depositField.objects.map(o => [o.id, o]))
const number = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
const samePoint = (point: XY) => point
const noop = () => {}

export function SectionMapView(props: { section: GeologySection; documents: GeologySection[]; disabled: boolean; onChange: (next: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const [overview, setOverview] = useState(true), [pending, setPending] = useState(false)
  return <><div className="section-map-mode" role="group" aria-label="Область карты разрезов"><Button size="sm" variant={overview ? 'primary' : 'secondary'} aria-pressed={overview} disabled={pending} onClick={() => setOverview(true)}>Месторождение</Button><Button size="sm" variant={!overview ? 'primary' : 'secondary'} aria-pressed={!overview} disabled={pending} onClick={() => setOverview(false)}>Текущий разрез · редактирование</Button></div>{overview ? <SectionFieldMap section={props.section} /> : <ProfileMap {...props} onPending={value => { setPending(value); props.onPending(value) }} />}</>
}
function SectionFieldMap({ section }: { section: GeologySection }) {
  const [camera, setCamera] = useState<Camera | null>(null), [hidden, setHidden] = useState<string[]>([]), [selection, setSelection] = useState(fieldProfiles[Math.max(0, (section.metadata?.mapProfileOrder ?? 1) - 1) % fieldProfiles.length]?.id ?? fieldProfiles[0]!.id)
  const [profileId, setProfileId] = useState(selection), [segmentIndex, setSegmentIndex] = useState(0), [labels, setLabels] = useState(true), [grid, setGrid] = useState(true), [topography, setTopography] = useState(true)
  const container = useRef<HTMLDivElement>(null), selected = objectsById.get(selection), profile = objectsById.get(profileId) ?? fieldProfiles[0]!
  const segments = useMemo(() => mapSegments(profile), [profile]), segment = segments[Math.min(segmentIndex, segments.length - 1)]
  const focus = (id: string) => {
    const object = objectsById.get(id); if (!object) return
    const r = container.current?.getBoundingClientRect()
    setCamera(fitCamera({ ...fieldScene, objects: [object] }, { width: r?.width ?? 900, height: r?.height ?? 600 }))
  }
  const choose = (ids: string[]) => { const object = objectsById.get(ids[0] ?? ''); if (!object) return; setSelection(object.id); if (object.kind === 'profile') { setProfileId(object.id); setSegmentIndex(0) } }
  return <section className="section-field-inspector">
    <h2>Карта месторождения</h2><p className="section-muted">8 215 скважин · {fieldProfiles.length} профилей · {fieldProfiles.reduce((n, p) => n + p.parts[0]!.nodes.length - 1, 0)} сегментов</p>
    <div className="section-field-search"><MapObjectSearch showKinds={false} project={fieldScene} onSelect={object => { choose([object.id]); setHidden(types => types.filter(t => t !== object.attributes.type)); focus(object.id) }} /></div>
    <label className="section-search">Профиль на карте<select value={profile.id} onChange={e => { setProfileId(e.target.value); setSelection(e.target.value); setSegmentIndex(0) }}>{fieldProfiles.map(p => <option key={p.id} value={p.id}>{p.name} · {mapSegments(p).length} сегм.</option>)}</select></label>
    <label className="section-search">Сегмент профиля<select value={Math.min(segmentIndex, segments.length - 1)} onChange={e => setSegmentIndex(Number(e.target.value))}>{segments.map((s, i) => <option key={s.id} value={i}>Сегмент {i + 1} · {s.wells.length} скв.</option>)}</select></label>
    <Button variant="secondary" size="sm" onClick={() => focus(profile.id)}><Crosshair size={15} />Показать профиль</Button>
    {segment && <div className="section-field-members"><strong>Скважины сегмента {segmentIndex + 1}</strong><ul>{segment.wells.map(id => <li key={id}><button type="button" onClick={() => { setSelection(id); setHidden(types => types.filter(t => t !== objectsById.get(id)?.attributes.type)); focus(id) }}>{objectsById.get(id)?.name}</button></li>)}</ul></div>}
    {selected?.kind === 'well' && <div className="section-field-selection"><strong>{selected.name}</strong><p>{selected.attributes.type}</p><dl><dt>X, м</dt><dd>{number(selected.parts[0]!.nodes[0]!.x)}</dd><dt>Y, м</dt><dd>{number(selected.parts[0]!.nodes[0]!.y)}</dd><dt>Глубина</dt><dd>{number(selected.attributes.depth)} м</dd></dl></div>}
    <ToolCategory category="display"><label><input type="checkbox" checked={topography} onChange={e => setTopography(e.target.checked)} />Подложка OpenTopoMap</label><label><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} />Подписи при приближении</label><label><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} />Координатная сетка</label></ToolCategory>
    <ToolCategory category="coordinates">{segment && <div className="section-form"><strong>{profile.name} · сегмент {segmentIndex + 1}</strong><p>От X {number(segment.a.x)}, Y {number(segment.a.y)}<br />до X {number(segment.b.x)}, Y {number(segment.b.y)}</p></div>}</ToolCategory>
    <PlotToolbar><div className="section-tool-icon-grid"><SectionToolButton label="Приблизить месторождение" icon={ZoomIn} variant="quiet" onClick={() => camera && setCamera({ ...camera, scale: Math.min(80, camera.scale * 1.5) })} /><SectionToolButton label="Отдалить месторождение" icon={ZoomOut} variant="quiet" onClick={() => camera && setCamera({ ...camera, scale: Math.max(.01, camera.scale / 1.5) })} /><SectionToolButton label="Всё месторождение" icon={Maximize2} variant="quiet" onClick={() => setCamera(null)} /></div><MapLayerToggles topography={topography} grid={grid} onTopography={setTopography} onGrid={setGrid} /></PlotToolbar>
    <PlotSurface><WellTypeFilters compact objects={fieldScene.objects} hidden={hidden} onChange={setHidden} /><div ref={container} className="section-field-map"><MapCanvas topography={topography} project={fieldScene} camera={camera} onCamera={setCamera} selected={selection} draft={null} tool="select" editable={false} hiddenWellTypes={hidden} snap={samePoint} onSelect={choose} onDraft={noop} onPoint={noop} onNode={noop} onCancel={() => setSelection('')} grid={grid} labels={labels} values={false} measure={[]} /></div></PlotSurface>
    <GraphHelp><p>Все 8 215 скважин показаны в общей системе координат: X — север, Y — восток. Выберите профиль или скважину. Для изменения геометрии текущего разреза откройте «Текущий разрез · редактирование».</p></GraphHelp>
  </section>
}
