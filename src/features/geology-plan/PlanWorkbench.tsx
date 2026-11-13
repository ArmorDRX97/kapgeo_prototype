import { bgdFieldWell } from '../geobase/model/bgdField'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapFullscreen } from '../../shared/lib/useMapFullscreen'
import { MapObjectPopup } from '../../entities/geology-map/ui/MapObjectPopup'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { Download, Eye, CircleHelp, Info, Layers3, LockKeyhole, Expand, Minimize2, LocateFixed, Map, MousePointer2, Move, PanelLeftClose, PanelLeftOpen, Pencil, ArrowUp, ArrowDown, Trash2, CirclePlus, CircleMinus, Type, Plus, Redo2, Ruler, Save, Undo2, Upload, FileDown, Image, ZoomIn, ZoomOut } from 'lucide-react'
import type { UserPersona } from '../../entities/session/model/types'
import { distance, fitCamera, projectOnSegment, type Camera } from '../../entities/geology-map/geometry'
import { defaultMapGrid, gridSchema, kindNames, layerEditable, layerVisible, makeObject, newId, objectIssues, point, projectSchema, shapeNames, type MapGrid, type MapObject, type MapProject, type SnapPoint, type XY } from '../../entities/geology-map/model'
import { canEditMap, mapRasterRepository, mapRepository } from '../../repository/demo/mapRepository'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { WorkspaceToolbar, WorkspaceToolbarGroup, WorkspaceToolbarStatus } from '../../shared/ui/WorkspaceToolbar'
import { WorkspacePanelHeading } from '../../shared/ui/WorkspacePanelHeading'
import { DiscardChangesDialog } from '../../shared/ui/DiscardChangesDialog'
import { useReportUnsavedChanges } from '../../shared/lib/useReportUnsavedChanges'
import { PlanIconButton } from './PlanIconButton'
import { PlanObjectSearch } from './PlanObjectSearch'
import { PlanQuickDisplay } from './PlanQuickDisplay'
import { PlanCanvas, type PlanTool } from './PlanCanvas'
import { MapLayerTree } from './PlanInspector'
import { PlanObjectEditor, type ObjectPanel } from './PlanObjectEditor'
import { PlanDisplay, PlanLegend } from './PlanDisplay'
import { boundWells, keepSegmentWells, snapToWell } from '../../entities/geology-map/anchors'
import { PlanExportDialog, RasterDialog, SvgImportDialog } from './PlanFiles'
import { downloadFile } from './export'
import { validatePlanSearch, type PlanSearch } from './search'

function rememberedCamera(id: string): Camera | null { try { const c = JSON.parse(sessionStorage.getItem(`kapgeo.map.camera.${id}`) ?? 'null'); return c && [c.x, c.y, c.scale].every(Number.isFinite) && c.scale >= .01 && c.scale <= 80 ? c : null } catch { return null } }
type Dialog = 'metadata' | 'help' | 'svg' | 'raster' | 'export' | 'layer' | 'display' | null
const drawingKinds = { line: 'Линия', area: 'Область', profile: 'Профиль', block: 'Геоблок' }
type DrawingKind = keyof typeof drawingKinds
const editModes = [
  { id: 'move', label: 'Переместить объект', icon: Move, instruction: 'Перетащите объект на плане.' },
  { id: 'add', label: 'Добавить точку', icon: CirclePlus, instruction: 'Щёлкните рядом с контуром, чтобы добавить точку.' },
  { id: 'delete', label: 'Удалить точку', icon: CircleMinus, instruction: 'Щёлкните по точке, которую нужно удалить.' },
  { id: 'label', label: 'Переместить подпись', icon: Type, instruction: 'Перетащите подпись объекта на плане.' },
] as const
type DisplayPreferences = { topography: boolean; grid: boolean; labels: boolean; forceLabels?: boolean; values: boolean; settings: MapGrid }
function readDisplayPreferences(id: string, fallback: MapGrid): DisplayPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(`kapgeo.map.display.${id}`) ?? 'null') as Partial<DisplayPreferences> | null
    const settings = gridSchema.safeParse(value?.settings)
    return { forceLabels: value?.forceLabels === true, topography: value?.topography ?? true, grid: value?.grid ?? true, labels: value?.labels ?? true, values: value?.values ?? false, settings: settings.success ? settings.data : fallback }
  } catch { return { topography: true, grid: true, labels: true, values: false, settings: fallback } }
}
export function PlanWorkbench({ initial, persona, search, onSearch, onSaved, onDeleted, registry, registryOpen, onRegistryToggle, registryMode, onRegistryModeChange }: { initial: MapProject; persona: UserPersona | null; search: PlanSearch; onSearch: (s: PlanSearch) => void; onSaved: () => void; onDeleted: () => void; registry: React.ReactNode; registryOpen: boolean; onRegistryToggle: () => void; registryMode: 'plans' | 'layers'; onRegistryModeChange: (mode: 'plans' | 'layers') => void }) {
  const fullscreen = useMapFullscreen()
  const navigate = useNavigate()
  const [contextPoint, setContextPoint] = useState<XY | null>(null)
  const cameraId = initial.fieldVersion ? `${initial.id}.layout${initial.fieldVersion}` : initial.id
  const leavingAfterDelete = useRef(false)
  const selectionAfterApply = useRef<string | null>(null)
  const [project, setProject] = useState(initial), [saved, setSaved] = useState(initial), [past, setPast] = useState<MapProject[]>([]), [future, setFuture] = useState<MapProject[]>([])
  const [draft, setDraft] = useState<MapObject | null>(null), [tool, setTool] = useState<PlanTool>('select'), [nodeId, setNodeId] = useState(''), [partIndex, setPartIndex] = useState(0)
  const [camera, setCamera] = useState<Camera | null>(() => rememberedCamera(cameraId)), [rightOpen, setRightOpen] = useState(() => window.innerWidth > 850), [layerId, setLayerId] = useState(initial.layers[0]?.id ?? '')
  const [display, setDisplay] = useState<DisplayPreferences>(() => readDisplayPreferences(initial.id, initial.grid ?? defaultMapGrid)), [displayDraft, setDisplayDraft] = useState<DisplayPreferences | null>(null), [snapMode, setSnapMode] = useState('collar'), [snapWells, setSnapWells] = useState<string[]>([]), [measure, setMeasure] = useState<XY[]>([])
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [dialog, setDialog] = useState<Dialog>(null), [metadata, setMetadata] = useState(project)
  const [candidates, setCandidates] = useState<string[]>([]), [drawKind, setDrawKind] = useState<DrawingKind>('line'), [drawShape, setDrawShape] = useState<MapObject['shape']>('straight'), [rasterUrl, setRasterUrl] = useState('')
  const [layerName, setLayerName] = useState(''), [layerParent, setLayerParent] = useState(''), [renameLayer, setRenameLayer] = useState(false), [saving, setSaving] = useState(false)
  const closeContext = useCallback(() => { setCandidates([]); setContextPoint(null) }, [])
  const [cancelRequested, setCancelRequested] = useState(false)
  const [toolGroup, setToolGroup] = useState<ObjectPanel | null>(null)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [hiddenWellTypes, setHiddenWellTypes] = useState<string[]>([])
  const viewProject = useMemo(() => ({ ...project, grid: display.settings, layers: project.layers.map(l => ({ ...l, visible: visibility[l.id] ?? l.visible })) }), [project, visibility, display.settings])
  const [coordinateX, setCoordinateX] = useState(60650), [coordinateY, setCoordinateY] = useState(94950)
  const dirty = useMemo(() => JSON.stringify(project) !== JSON.stringify(saved), [project, saved])
  const editable = canEditMap(persona, saved), pending = !!draft || ['metadata', 'layer', 'svg', 'raster'].includes(dialog ?? '') && editable
  const selectedId = draft?.id ?? search.selection, selected = draft ?? project.objects.find(o => o.id === selectedId), objectEditable = editable && !!selected && layerEditable(project, selected.layerId)
  const activeGroup = toolGroup ?? (selected ? 'objects' : 'create')
  const drawingLayers = project.layers.filter(layer => layer.id !== 'wells' && layerEditable(project, layer.id))
  const dedicatedLayerId = drawKind === 'block' ? 'blocks' : drawKind === 'profile' ? 'profiles' : undefined
  const drawingLayer = drawingLayers.find(layer => layer.id === (dedicatedLayerId ?? layerId))
    ?? (dedicatedLayerId && project.layers.some(layer => layer.id === dedicatedLayerId) ? undefined : drawingLayers[0])
  const activeEditMode = editModes.find(mode => mode.id === tool)
  const actualCamera = camera ?? fitCamera(project, { width: 900, height: 650 })
  const changeCamera = (c: Camera) => { setCamera(c); try { sessionStorage.setItem(`kapgeo.map.camera.${cameraId}`, JSON.stringify(c)) } catch { /* Optional view state. */ } }
  const changeQuickDisplay = (patch: Partial<Pick<DisplayPreferences, 'topography' | 'grid' | 'forceLabels'>>) => {
    const next = { ...display, ...patch }
    setDisplay(next)
    try { localStorage.setItem(`kapgeo.map.display.${project.id}`, JSON.stringify(next)) } catch { /* View remains available for this session. */ }
  }
  useEffect(() => { const open = () => { setDisplayDraft(display); setDialog('display') }; window.addEventListener('kapgeo:open-plan-display', open); return () => window.removeEventListener('kapgeo:open-plan-display', open) }, [display])
  const blocker = useBlocker({ withResolver: true, disabled: !dirty && !pending, enableBeforeUnload: dirty || pending, shouldBlockFn: ({ current, next }) => {
    const selection = validatePlanSearch(next.search as Record<string, unknown>).selection
    if (current.pathname === next.pathname && selectionAfterApply.current === selection) { selectionAfterApply.current = null; return false }
    return !leavingAfterDelete.current && (current.pathname !== next.pathname || pending && validatePlanSearch(current.search as Record<string, unknown>).selection !== selection)
  } })
  const commit = (next: MapProject) => {
    if (!editable) return false
    const result = projectSchema.safeParse(next)
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Проверьте проект.'); return false }
    if (JSON.stringify(next) === JSON.stringify(project)) return true
    setPast(p => [...p.slice(-29), project]); setFuture([]); setProject(result.data); setError(''); setNotice(''); return true
  }
  const cancelNow = () => { setCancelRequested(false); setMeasure([]); setDraft(null); setTool('select'); setNodeId(''); setToolGroup(null); setError(''); setNotice('Операция отменена') }
  const cancel = () => { if (draft) setCancelRequested(true); else cancelNow() }
  const save = async (proceed = false): Promise<boolean> => {
    if (pending) { setError('Сначала примените или отмените текущую операцию.'); return false }
    setSaving(true)
    try { const next = mapRepository.save(project, persona); setProject(next); setSaved(next); setError(''); setNotice('План сохранён'); onSaved(); if (proceed) blocker.proceed?.(); return true } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить.'); return false } finally { setSaving(false) }
  }
  useReportUnsavedChanges(dirty || pending, undefined, { save: () => save(), discard: () => { setProject(saved); setDraft(null); setDialog(null) } })
  useEffect(() => {
    const key = project.underlay?.key; let disposed = false, url = ''
    if (key) void mapRasterRepository.get(key).then(blob => { if (disposed) return; if (!blob) { setError('Файл подложки отсутствует. Откройте «Подложка» и загрузите изображение заново.'); setRasterUrl(''); return }; url = URL.createObjectURL(blob); setRasterUrl(url) }).catch(() => { if (!disposed) setError('Не удалось открыть подложку.') })
    return () => { disposed = true; if (url) URL.revokeObjectURL(url) }
  }, [project.underlay?.key])
  const wells = useMemo(() => project.objects.filter(o => o.kind === 'well'), [project.objects])
  const snap = (p: XY, radius: number): SnapPoint => {
    if (snapMode === 'between') { const a = wells.find(w => w.id === snapWells[0] && layerVisible(viewProject,w.layerId))?.parts[0]?.nodes[0], b = wells.find(w => w.id === snapWells[1] && layerVisible(viewProject,w.layerId))?.parts[0]?.nodes[0]; return a && b && snapWells[0] !== snapWells[1] ? projectOnSegment(p,a,b) : p }
    return snapMode === 'bottom' || snapMode === 'collar' ? snapToWell(viewProject,p,radius,snapMode) : p
  }
  const edit = (input: MapObject) => { if (!editable || !layerEditable(project, input.layerId)) return; const old = project.objects.find(o => o.id === input.id); if (input.kind === 'well' && old && JSON.stringify(old.parts) !== JSON.stringify(input.parts)) { setError('Геометрия исходной скважины защищена.'); return }; const o = keepSegmentWells(input); if (Object.keys(input.segmentWells ?? {}).length > Object.keys(o.segmentWells ?? {}).length && !window.confirm('Изменение удалит состав скважин затронутых сегментов. Продолжить?')) return; setDraft(o); setError(''); setNotice(''); setRightOpen(true) }
  const apply = () => { if (!draft) return; const objects = project.objects.some(o => o.id === draft.id) ? project.objects.map(o => o.id === draft.id ? draft : o) : [...project.objects, draft]; if (commit({ ...project, objects })) { setDraft(null); setTool('select'); setToolGroup(null); setNotice('Построение применено'); selectionAfterApply.current = draft.id; onSearch({ selection: draft.id }) } }
  const select = (id: string, center = false) => { if (pending && id !== selectedId) { onSearch({ selection: id }); return }; onSearch({ selection: id || undefined }); const object = project.objects.find(o => o.id === id); if (object) { if (object.kind === 'well') setHiddenWellTypes(types => types.filter(type => type !== object.attributes.type)); setLayerId(object.layerId) }; setToolGroup(null); setTool('select'); setMeasure([]); setNotice(''); setCandidates([]); setNodeId(''); if (center) { const n = object?.parts.flatMap(p => p.nodes); if (n?.length) changeCamera({ ...actualCamera, x: n.reduce((s, p) => s + p.x, 0) / n.length, y: n.reduce((s, p) => s + p.y, 0) / n.length, scale: Math.max(actualCamera.scale, 1.5) }) } }
  const startDrawing = () => {
    if (!editable || pending || !drawingLayer) return
    const kind = drawKind === 'line' || drawKind === 'area' ? 'contour' : drawKind
    const object = makeObject(drawingLayer.id, kind, [], dedicatedLayerId ? 'straight' : drawShape)
    object.closed = drawKind === 'area' || drawKind === 'block'
    object.name = `${drawingKinds[drawKind]} ${project.objects.filter(item => item.kind === kind).length + 1}`
    if (dedicatedLayerId) object.style.fill = 'none'
    setLayerId(drawingLayer.id)
    setDraft(object)
    setCoordinateX(actualCamera.x)
    setCoordinateY(actualCamera.y)
    setPartIndex(0)
    setTool('draw')
    setToolGroup('coordinates')
    setRightOpen(true)
    setNotice('')
    setError('')
  }
  const addPoint = (p: SnapPoint) => { if (tool === 'measure') { setNotice(''); setMeasure(m => m.length < 2 ? [...m, p] : [p]); return }; if (!draft || tool !== 'draw') return; const next = { ...draft, parts: draft.parts.map((part, i) => i === partIndex ? { ...part, nodes: [...part.nodes, { ...point(p.x,p.y), ...p }] } : part) }; edit(next); if (next.kind === 'well' && next.parts[0]!.nodes.length === 2) setTool('select') }
  const undo = () => { const p = past.at(-1); if (p && !pending && editable) { setFuture(f => [project, ...f]); setProject({ ...p, revision: saved.revision }); setPast(past.slice(0, -1)); if (search.selection && !p.objects.some(object => object.id === search.selection)) onSearch({}); setNotice('Действие отменено') } }
  const redo = () => { const p = future[0]; if (p && !pending && editable) { setPast([...past, project]); setProject({ ...p, revision: saved.revision }); setFuture(future.slice(1)); setNotice('Действие повторено') } }
  const currentLayer = project.layers.find(l => l.id === layerId)
  const layerPeers = project.layers.filter(layer => layer.parentId === currentLayer?.parentId), layerIndex = layerPeers.findIndex(layer => layer.id === layerId)
  const changeLayer = (direction: number) => { if (!currentLayer) return; const peers = project.layers.filter(l => l.parentId === currentLayer.parentId), other = peers[peers.findIndex(l => l.id === layerId) + direction]; if (!other) return; const layers = [...project.layers], a = layers.findIndex(l => l.id === layerId), b = layers.findIndex(l => l.id === other.id); [layers[a], layers[b]] = [layers[b]!, layers[a]!]; commit({ ...project, layers }) }
  const openMetadata = () => { setMetadata(project); setDialog('metadata') }
  const status = !editable ? 'readonly' : pending || saving ? 'pending' : dirty ? 'dirty' : 'saved'
  const statusLabel = saving ? 'Сохраняем…' : { readonly: 'Только просмотр', pending: 'Правки не применены', dirty: 'Не сохранено', saved: 'Сохранено' }[status]
  return <div className={`map-workbench${fullscreen.active ? ' map-is-fullscreen' : ''}${!registryOpen ? ' map-hide-registry' : ''}${!rightOpen ? ' map-hide-tools' : ''}`}>
    {error && <div className="map-alert" role="alert">{error}</div>}{project.migrationNote && <div className="map-migration" role="status">{project.migrationNote}</div>}
    <div className="map-workspace">
      <aside className="map-left" aria-label="Проекты и слои плана">
        <div className="map-panel-switch workspace-tabs workspace-tabs--compact" role="group" aria-label="Левая панель плана">
          {registryOpen && <>
            <Button size="sm" variant="quiet" aria-pressed={registryMode === 'plans'} aria-controls="map-projects-and-layers" onClick={() => onRegistryModeChange('plans')}><Map size={15} />Планы</Button>
            <Button size="sm" variant="quiet" aria-pressed={registryMode === 'layers'} aria-controls="map-projects-and-layers" onClick={() => onRegistryModeChange('layers')}><Layers3 size={15} />Слои</Button>
          </>}
          <PlanIconButton icon={registryOpen ? PanelLeftClose : PanelLeftOpen} label={registryOpen ? 'Свернуть левую панель' : 'Открыть проекты и слои'} aria-expanded={registryOpen} aria-controls="map-projects-and-layers" onClick={onRegistryToggle} />
        </div>
        <div id="map-projects-and-layers" className="map-left-body" hidden={!registryOpen}>
          {registryMode === 'plans' ? registry : <><div className="map-layer-actions"><Button size="sm" variant="secondary" disabled={!editable || pending} onClick={() => { setRenameLayer(false); setLayerName('Новый слой'); setLayerParent(''); setDialog('layer') }}>+ Слой</Button><Button size="sm" variant="quiet" disabled={!editable || pending || !currentLayer} onClick={() => { setRenameLayer(false); setLayerName('Новый подслой'); setLayerParent(layerId); setDialog('layer') }}>+ Подслой</Button></div><PlanObjectSearch showKinds={false} project={viewProject} onSelect={object => { select(object.id, true); if (!layerVisible(viewProject, object.layerId)) setNotice('Объект находится в скрытом слое. Включите слой в дереве.') }} /><MapLayerTree project={viewProject} selected={selectedId} layerId={layerId} onLayer={setLayerId} onSelect={id => select(id, true)} onChange={next => { if (editable) commit(next); else { setVisibility(Object.fromEntries(next.layers.map(l => [l.id, l.visible]))); setNotice('Видимость изменена только в текущем просмотре') } }} disabled={pending} /><div className="map-layer-footer"><span>{currentLayer ? `Слой: ${currentLayer.name}` : 'Выберите слой'}</span><div className="map-actions"><PlanIconButton icon={Pencil} label="Переименовать слой" disabled={!editable || pending || !currentLayer} onClick={() => { setRenameLayer(true); setLayerName(currentLayer!.name); setDialog('layer') }} /><PlanIconButton icon={ArrowUp} label="Слой выше" disabled={!editable || pending || !currentLayer || layerIndex <= 0} onClick={() => changeLayer(-1)} /><PlanIconButton icon={ArrowDown} label="Слой ниже" disabled={!editable || pending || !currentLayer || layerIndex >= layerPeers.length - 1} onClick={() => changeLayer(1)} /><PlanIconButton icon={LockKeyhole} variant={currentLayer?.locked ? 'primary' : 'quiet'} label="Блокировка слоя" title={currentLayer?.locked ? 'Разблокировать слой' : 'Заблокировать слой'} aria-pressed={!!currentLayer?.locked} disabled={!editable || pending || !currentLayer} onClick={() => commit({ ...project, layers: project.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l) })} /><PlanIconButton icon={Trash2} label="Удалить слой" disabled={!editable || pending || !currentLayer} onClick={() => { if (!currentLayer) return; if (project.layers.some(l => l.parentId === layerId)) { setError('Сначала удалите или перенесите подслои.'); return }; if (project.objects.some(o => o.layerId === layerId && o.kind === 'well')) { setError('Слой содержит исходные скважины. Их удаление в карте запрещено.'); return }; const count = project.objects.filter(o => o.layerId === layerId).length; if (window.confirm(`Удалить слой «${currentLayer.name}» и ${count} объектов?`)) commit({ ...project, layers: project.layers.filter(l => l.id !== layerId), objects: project.objects.filter(o => o.layerId !== layerId) }) }} /></div></div></> }
        </div>
      </aside>
      <section className="map-center" aria-label="Рабочий план">
        <WorkspaceToolbar preferenceKey="kapgeo.plan.toolbar-dock" controls={<>
          <WorkspaceToolbarGroup label="Масштаб и вид плана">
            <PlanIconButton icon={ZoomIn} label="Приблизить план" onClick={() => changeCamera({ ...actualCamera, scale: Math.min(80, actualCamera.scale * 1.25) })} />
            <PlanIconButton icon={ZoomOut} label="Отдалить план" onClick={() => changeCamera({ ...actualCamera, scale: Math.max(.01, actualCamera.scale / 1.25) })} />
            <PlanIconButton icon={LocateFixed} label="Вписать весь план" onClick={() => { setCamera(null); sessionStorage.removeItem(`kapgeo.map.camera.${cameraId}`) }} />
            <PlanIconButton icon={fullscreen.active ? Minimize2 : Expand} label={fullscreen.active ? 'Выйти из полноэкранного режима' : 'На весь экран'} onClick={() => { closeContext(); void fullscreen.toggle() }} />
            <PlanIconButton icon={Eye} label="Отображение" onClick={() => { setDisplayDraft(display); setDialog('display') }} />
            <PlanQuickDisplay topography={display.topography} grid={display.grid} labels={display.labels} forceLabels={display.forceLabels ?? false} onChange={changeQuickDisplay} />
          </WorkspaceToolbarGroup>
          <WorkspaceToolbarGroup label="Инструменты карты">
            <PlanIconButton icon={MousePointer2} variant={tool === 'select' ? 'primary' : 'quiet'} onClick={() => { setTool('select'); setMeasure([]); setNotice('') }} aria-pressed={tool === 'select'} label="Выбор объектов" />
            <PlanIconButton icon={Ruler} variant={tool === 'measure' ? 'primary' : 'quiet'} disabled={!!draft} onClick={() => { setTool(tool === 'measure' ? 'select' : 'measure'); setMeasure([]); setNotice('') }} aria-pressed={tool === 'measure'} label="Измерить расстояние" />
          </WorkspaceToolbarGroup>
          <WorkspaceToolbarGroup label="Действия с планом">
            <PlanIconButton icon={Download} label="Скачать план JSON" onClick={() => downloadFile(`${project.id}.json`, JSON.stringify(project, null, 2))} />
            <PlanIconButton icon={Undo2} label="Отменить действие плана" disabled={!editable || pending || !past.length} onClick={undo} />
            <PlanIconButton icon={Redo2} label="Повторить действие плана" disabled={!editable || pending || !future.length} onClick={redo} />
            <PlanIconButton icon={Save} variant="primary" label="Сохранить план" title={!editable || !dirty || pending || saving ? `Сохранить план · ${statusLabel.toLowerCase()}` : undefined} disabled={!editable || !dirty || pending || saving} onClick={() => void save()} />
          </WorkspaceToolbarGroup>
          <div className="map-toolbar-end">
            <WorkspaceToolbarGroup label="Файлы и чертёж">
              <PlanIconButton icon={Upload} label="Импорт SVG" disabled={!editable || pending || !layerEditable(project, layerId)} onClick={() => setDialog('svg')} />
              <PlanIconButton icon={Image} label="Растровая подложка" disabled={!editable || pending} onClick={() => setDialog('raster')} />
              <PlanIconButton icon={FileDown} label="Чертёж / экспорт" disabled={pending} onClick={() => setDialog('export')} />
            </WorkspaceToolbarGroup>
            <WorkspaceToolbarGroup label="Состояние и справка">
              <WorkspaceToolbarStatus state={status} label={statusLabel} />
              <PlanIconButton icon={Info} label="Сведения о плане" disabled={!!draft} onClick={openMetadata} />
              <PlanIconButton icon={CircleHelp} label="Как работать" onClick={() => setDialog('help')} />
            </WorkspaceToolbarGroup>
          </div>
        </>}>
          <div className="map-plan-view">
      <PlanCanvas interactiveScale statusControls={<PlanLegend objects={project.objects} hidden={hiddenWellTypes} onHidden={setHiddenWellTypes} />} hideDemoLabel forceWellLabels={display.forceLabels} topography={display.topography} hiddenWellTypes={hiddenWellTypes} project={viewProject} camera={camera} onCamera={changeCamera} selected={selectedId} draft={draft} tool={tool} editable={(objectEditable || !!draft && editable) && selected?.kind !== 'well'} snap={snap} onSelect={ids => { const id = ids[0] ?? ''; select(id, project.objects.find(o => o.id === id)?.kind === 'well') }} onContextSelect={(ids, at) => { setCandidates(ids); setContextPoint(at) }} onDraft={edit} onPoint={addPoint} onNode={id => { setNodeId(id); setToolGroup('coordinates') }} onCancel={cancel} grid={display.grid} labels={display.labels} values={display.values} measure={measure} rasterUrl={project.underlay ? rasterUrl : undefined} />
      {draft && <div className="map-draft-bar"><span>{tool === 'draw' ? 'Указывайте точки на плане' : `Редактирование: ${draft.name}`} · {draft.parts.reduce((n, p) => n + p.nodes.length, 0)} точек</span>{tool === 'draw' && <Button size="sm" variant="secondary" onClick={() => setTool('select')}>Завершить ввод</Button>}<Button size="sm" variant="secondary" onClick={cancel}>Отмена</Button><Button size="sm" disabled={!!objectIssues(draft).length} onClick={apply}>Применить</Button></div>}
      <div className="map-notice" hidden={!notice && !selected && !search.selection && tool !== 'measure' && tool !== 'draw'} role="status">{notice || (search.selection && !selected ? 'Объект не найден в этом плане. Выберите другой.' : tool === 'measure' ? measure.length === 2 ? `Расстояние ${distance(measure[0]!, measure[1]!).toFixed(2)} м` : 'Укажите две точки для измерения' : tool === 'draw' ? 'Укажите точки на карте или в координатах справа' : selected ? `${selected.name} · ${kindNames[selected.kind]}` : 'Выберите объект на карте · поиск — в панели слоёв')}</div>
          </div>
        </WorkspaceToolbar>
      </section>
      <aside className="map-right" aria-label="Инструменты плана">
        <WorkspacePanelHeading title="Инструменты" open={rightOpen} controls="map-tools" onToggle={() => setRightOpen(open => !open)} openLabel="Показать инструменты плана" closeLabel="Свернуть инструменты" />
        <div id="map-tools" className="map-right-body" hidden={!rightOpen}>
          <PlanObjectEditor
            project={viewProject} group={activeGroup} onGroup={setToolGroup} object={selected} draft={!!draft} disabled={!objectEditable}
            nodeId={nodeId} onNode={id => { setNodeId(id); setToolGroup('coordinates') }} onDraft={edit}
            onDelete={() => { if (selected && window.confirm(`Удалить объект «${selected.name}»?`)) { commit({ ...project, objects: project.objects.filter(o => o.id !== selected.id) }); onSearch({}); setToolGroup(null) } }}
            onAddPart={() => {
              if (!selected) return
              setPartIndex(selected.parts.length)
              edit({ ...selected, parts: [...selected.parts, { id: newId(), nodes: [] }] })
              setTool('draw')
              setToolGroup('coordinates')
            }}
            snap={snapMode} onSnap={setSnapMode} snapWells={snapWells} onSnapWells={setSnapWells} wells={wells}
            creationTools={<>
              <div className="map-form-grid">
                <label>Тип<select disabled={!editable || pending} value={drawKind} onChange={event => setDrawKind(event.target.value as DrawingKind)}>{Object.entries(drawingKinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                <label>Форма<select disabled={!editable || pending || !!dedicatedLayerId} value={dedicatedLayerId ? 'straight' : drawShape} onChange={event => setDrawShape(event.target.value as MapObject['shape'])}>{Object.entries(shapeNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              </div>
              {dedicatedLayerId ? <small className="map-muted">Слой · {drawingLayer?.name ?? 'Нет доступного слоя'}</small> :
                <label>Слой<select disabled={!editable || pending || !drawingLayers.length} value={drawingLayer?.id ?? ''} onChange={event => setLayerId(event.target.value)}>
                  {!drawingLayers.length && <option value="">Нет доступных слоёв</option>}{drawingLayers.map(layer => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
                </select></label>}
              <Button size="sm" disabled={!editable || pending || !drawingLayer} onClick={startDrawing}><Plus size={15} />Построить на плане</Button>
            </>}
            editTools={objectEditable && selected && selected.kind !== 'well' && tool !== 'draw' && <>
              <div className="map-edit-tools" data-tooltip-group role="group" aria-label="Редактирование на плане">
                {editModes.map(({ id, label, icon }) => <PlanIconButton key={id} icon={icon} label={label} variant={tool === id ? 'primary' : 'secondary'} aria-pressed={tool === id} disabled={id === 'move' && boundWells(selected).length > 0} onClick={() => setTool(tool === id ? 'select' : id)} />)}
              </div>
              {activeEditMode && <p className="map-muted" role="status">{activeEditMode.instruction}</p>}
            </>}
            drawingTools={tool === 'draw' && editable && <div className="map-coordinate-entry map-form">
              <strong>Добавить точку</strong>
              <div className="map-form-grid">
                <label>X новой точки, м<input type="number" value={coordinateX} onChange={event => setCoordinateX(Number(event.target.value))} /></label>
                <label>Y новой точки, м<input type="number" value={coordinateY} onChange={event => setCoordinateY(Number(event.target.value))} /></label>
              </div>
              <Button size="sm" variant="secondary" disabled={![coordinateX, coordinateY].every(value => Number.isFinite(value) && Math.abs(value) <= 1e8)} onClick={() => addPoint({ x: coordinateX, y: coordinateY })}>Добавить координату</Button>
            </div>}
          />
        </div>
      </aside>
    </div>
    {dialog === 'help' && <WorkspaceDialog title="Как работать с планом" size="compact" onClose={() => setDialog(null)}><div className="map-help"><strong>Создать объект</strong><ol><li>В разделе «Новое построение» выберите тип, форму и слой.</li><li>Нажмите «Построить на плане» и укажите точки контура щелчками по карте. Точные координаты можно ввести в разделе «Координаты точек».</li><li>Нажмите «Завершить ввод», проверьте геометрию и выберите «Применить».</li></ol><ul><li>ЛКМ выбирает объект; перетаскивание фона перемещает вид.</li><li>Колесо масштабирует под указателем, Shift + колесо перемещает по горизонтали. Стрелки и +/− работают с клавиатуры.</li><li>Исходные скважины неподвижны. Для блока выбирайте точку контура, а не скважину. Привязка по умолчанию — к кругу скважины (устью); при необходимости выберите забой. Связанные точки перетаскиваются к другой скважине; для свободного ввода нажмите «Отвязать точку».</li><li>Точки выбранного объекта можно перетаскивать. Координаты меняются в правой панели; камера при этом остаётся на месте.</li><li>ПКМ показывает объекты под указателем. При пересечении выбирайте нужный из списка. Shift + F10 открывает сведения выбранного объекта.</li><li>Геологический план показывает скважины, геоблоки и профили. Технологические блоки, насосы/растворы и расчётные сетки относятся к отдельным модулям.</li><li>«Применить» завершает правки одного объекта. «Сохранить план» записывает весь документ. Escape отменяет текущую операцию.</li><li>У Безье точки 1, 4, 7… — якоря, остальные — управляющие. Добавление разбивает ближайший сегмент, сохраняя форму. Удаление узла удаляет связанный якорь и пару управляющих точек. Вложенные части областей образуют отверстия по правилу even-odd.</li></ul></div></WorkspaceDialog>}
    {dialog === 'display' && displayDraft && <WorkspaceDialog title="Отображение плана" onClose={() => { setDisplayDraft(null); setDialog(null) }} footer={<><Button variant="secondary" onClick={() => { setDisplayDraft(null); setDialog(null) }}>Отмена</Button><Button disabled={!gridSchema.safeParse(displayDraft.settings).success} onClick={() => { const next = displayDraft; setDisplay(next); try { localStorage.setItem(`kapgeo.map.display.${project.id}`, JSON.stringify(next)); setNotice('Настройки отображения сохранены на этом устройстве') } catch { setNotice('Настройки применены только до закрытия вкладки') }; setDisplayDraft(null); setDialog(null) }}>Сохранить отображение</Button></>}><PlanDisplay labels={displayDraft.labels} onLabels={v => setDisplayDraft({ ...displayDraft, labels: v })} values={displayDraft.values} onValues={v => setDisplayDraft({ ...displayDraft, values: v })} settings={displayDraft.settings} onSettings={settings => setDisplayDraft({ ...displayDraft, settings })} /></WorkspaceDialog>}
    {dialog === 'metadata' && <WorkspaceDialog title="Сведения о плане" onClose={() => setDialog(null)} footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Отмена</Button>{editable && <Button onClick={() => { if (commit(metadata)) setDialog(null) }}>Применить сведения</Button>}</>}><div className="map-form"><label>Название<input disabled={!editable} value={metadata.title} maxLength={120} onChange={e => setMetadata({ ...metadata, title: e.target.value })} /></label><div className="map-form-grid"><label>Месторождение<select disabled value={metadata.deposit}><option>{metadata.deposit}</option></select></label><label>Залежь<input disabled={!editable} value={metadata.lens} onChange={e => setMetadata({ ...metadata, lens: e.target.value })} /></label><label>Дата составления<input type="date" disabled={!editable} value={metadata.date} onChange={e => setMetadata({ ...metadata, date: e.target.value })} /></label><label>Составил<input disabled={!editable} value={metadata.author} onChange={e => setMetadata({ ...metadata, author: e.target.value })} /></label></div><label>Описание<textarea disabled={!editable} value={metadata.description} onChange={e => setMetadata({ ...metadata, description: e.target.value })} /></label><p className="map-muted">{project.objects.filter(o => o.kind === 'well').length} скважин · {project.layers.length} слоёв · ревизия {saved.revision}</p>{editable && <Button variant="danger" disabled={dirty} onClick={() => { if (window.confirm(`Удалить план «${project.title}»?`)) { try { mapRepository.remove(saved, persona); leavingAfterDelete.current = true; setDialog(null); onDeleted() } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить.') } } }}><Trash2 size={15} />Удалить план</Button>}{error && <p role="alert" className="map-error">{error}</p>}</div></WorkspaceDialog>}
    {dialog === 'layer' && <WorkspaceDialog title={renameLayer ? 'Название слоя' : 'Новый слой'} size="compact" onClose={() => setDialog(null)} footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Отмена</Button><Button disabled={!layerName.trim()} onClick={() => { const id = renameLayer ? layerId : newId(); if (commit({ ...project, layers: renameLayer ? project.layers.map(l => l.id === id ? { ...l, name: layerName } : l) : [...project.layers, { id, parentId: layerParent || null, name: layerName, visible: true, locked: false }] })) { setLayerId(id); setDialog(null) } }}>Применить слой</Button></>}><label className="map-form">Название<input value={layerName} maxLength={120} onChange={e => setLayerName(e.target.value)} /></label>{layerParent && <p>Родитель: {project.layers.find(l => l.id === layerParent)?.name}</p>}</WorkspaceDialog>}
    {dialog === 'svg' && <SvgImportDialog layerId={layerId} camera={actualCamera} onClose={() => setDialog(null)} onApply={objects => { if (commit({ ...project, objects: [...project.objects, ...objects] })) { setDialog(null); setNotice(`Импортировано объектов: ${objects.length}`); setCamera(null) } }} />}
    {dialog === 'raster' && <RasterDialog project={project} camera={actualCamera} onClose={() => setDialog(null)} onApply={underlay => { if (commit({ ...project, underlay })) setDialog(null) }} />}
    {dialog === 'export' && <PlanExportDialog project={viewProject} camera={actualCamera} onClose={() => setDialog(null)} onSettings={editable ? settings => { commit({ ...project, print: settings }) } : undefined} />}
    {candidates.length > 0 && contextPoint && <MapObjectPopup getStatus={object => bgdFieldWell(object.id.startsWith('BGD-') ? object.id : `BGD-${object.id}`)?.status ?? (object.attributes.type === 'Проектная' ? 'На проверке' : 'Работает')} objects={candidates.map(id => project.objects.find(o => o.id === id)).filter((o): o is MapObject => !!o)} at={contextPoint} onClose={closeContext} onSelect={id => { const ids = candidates; select(id); setCandidates(ids) }} onOpenWell={id => { void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: id.startsWith('field-well-') ? `BGD-${id}` : id.startsWith('WELL-') ? id : 'WELL-1010-FULL' } }) }} />}
    {cancelRequested && <DiscardChangesDialog action="close" onStay={() => setCancelRequested(false)} onDiscard={cancelNow} description="У объекта есть неприменённые изменения. Продолжите редактирование или отмените текущую операцию." />}
    {blocker.status === 'blocked' && <DiscardChangesDialog onStay={() => blocker.reset()} onDiscard={() => { setDraft(null); setDialog(null); blocker.proceed() }} onSave={!pending && editable ? () => void save(true) : undefined} error={error} description={pending ? 'Есть незавершённая операция. Вернитесь, чтобы применить её, или отбросьте правки перед переходом.' : 'План изменён. Сохраните весь документ или отбросьте изменения перед переходом.'} />}
  </div>
}
