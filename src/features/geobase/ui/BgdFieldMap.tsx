import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Maximize2, MoreHorizontal, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import { WellTypeFilters } from '../../../entities/geology-map/ui/WellTypeFilters'
import { type Camera } from '../../../entities/geology-map/geometry'
import { Button } from '../../../shared/ui/Button'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { Switch } from '../../../shared/ui/Switch'
import { bgdFieldWell, bgdFieldWells, bgdOnlyWells, filterBgdWells, useBgdFieldFilters } from '../model/bgdField'
import { fetchWell } from '../../../repository/api'
import './bgd-field-map.css'

const noop = () => {}
function MapControl({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <Tooltip content={label}><Button size="sm" variant="quiet" className="bgd-map-icon" aria-label={label} onClick={onClick}><Icon size={17} /></Button></Tooltip>
}
function rememberedView(depositId: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`kapgeo.bgd.map-view.${depositId}`) ?? '{}')
    const camera = value.camera && [value.camera.x, value.camera.y, value.camera.scale].every(Number.isFinite) && value.camera.scale >= .001 && value.camera.scale <= 80 ? value.camera as Camera : null
    return { camera, topography: value.topography !== false, grid: value.grid !== false, forceLabels: value.forceLabels === true }
  } catch { return { camera: null, topography: true, grid: true, forceLabels: false } }
}
export function BgdFieldMap({ depositId, onOpenWell, focusWellId }: { depositId: string; onOpenWell?: (id: string) => void; focusWellId?: string }) {
  const { filters, setFilters, reset } = useBgdFieldFilters(depositId)
  const catalogueWell = bgdFieldWell(focusWellId)
  const focusQuery = useQuery({ queryKey: ['well', focusWellId], queryFn: () => fetchWell(focusWellId!), enabled: !!focusWellId && !catalogueWell, retry: false })
  const focusWell = useMemo(() => {
    if (catalogueWell) return catalogueWell
    const well = focusQuery.data, template = bgdFieldWells[0]
    if (!well || !template || !Number.isFinite(well.coordinates.x) || !Number.isFinite(well.coordinates.y)) return undefined
    return { ...template, id: well.id, name: well.code, attributes: { ...template.attributes, type: well.type }, parts: template.parts.map(part => ({ ...part, nodes: part.nodes.map(node => ({ ...node, x: well.coordinates.x, y: well.coordinates.y })) })) }
  }, [catalogueWell, focusQuery.data])
  const focused = useRef('')
  const [initial] = useState(() => rememberedView(depositId))
  const [forceLabels, setForceLabels] = useState(initial.forceLabels)
  const [displayOpen, setDisplayOpen] = useState(false)
  const displayRef = useRef<HTMLDivElement>(null)
  const displayButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!displayOpen) return
    const outside = (event: PointerEvent) => { if (!displayRef.current?.contains(event.target as Node)) setDisplayOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDisplayOpen(false); displayButton.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [displayOpen])
  const [cameraState, setCameraState] = useState<{ wellId?: string; camera: Camera | null }>({ camera: initial.camera })
  const point = focusWell?.parts[0]?.nodes[0]
  const camera = useMemo(() => point && cameraState.wellId !== focusWell?.id ? { x: point.x, y: point.y, scale: 1.5 } : cameraState.camera, [point, cameraState, focusWell?.id])
  const setCamera = useCallback((next: Camera | null) => setCameraState({ wellId: focusWell?.id, camera: next }), [focusWell?.id])
  const [topography, setTopography] = useState(initial.topography), [grid, setGrid] = useState(initial.grid)
  useEffect(() => {
    if (!focusWell || focused.current === focusWell.id) return
    focused.current = focusWell.id
    if (focusWell.parts[0]?.nodes[0]) reset()
  }, [focusWell, reset])
  useEffect(() => { try { sessionStorage.setItem(`kapgeo.bgd.map-view.${depositId}`, JSON.stringify({ camera, topography, grid, forceLabels })) } catch { /* Optional view state. */ } }, [depositId, camera, topography, grid, forceLabels])
  const { scene, typeScope } = useMemo(() => { const objects = filterBgdWells(filters); if (focusWell && !catalogueWell) objects.push(focusWell); return { scene: bgdOnlyWells(objects), typeScope: filterBgdWells({ ...filters, hiddenTypes: [] }) } }, [filters, focusWell, catalogueWell])
  const visible = scene.objects
  return <section className="bgd-field-map" aria-label="Карта скважин месторождения">
    <div className="bgd-field-toolbar" data-tooltip-group>
      <select className="bgd-field-toolbar__site" aria-label="Участок" value={filters.site} onChange={e => setFilters({ site: e.target.value })}><option value="all">Все участки</option><option>Северный</option><option>Южный</option></select>
      <span className="bgd-field-toolbar__separator" aria-hidden="true" />
      <WellTypeFilters compact objects={typeScope} hidden={filters.hiddenTypes} onChange={hiddenTypes => setFilters({ hiddenTypes })} />
      <div className="bgd-field-toolbar__controls"><MapControl icon={ZoomIn} label="Приблизить карту скважин" onClick={() => camera && setCamera({ ...camera, scale: Math.min(80, camera.scale * 1.5) })} /><MapControl icon={ZoomOut} label="Отдалить карту скважин" onClick={() => camera && setCamera({ ...camera, scale: Math.max(.01, camera.scale / 1.5) })} /><MapControl icon={Maximize2} label="Всё месторождение" onClick={() => setCamera(null)} />
        <div className="bgd-map-display" ref={displayRef}><Tooltip content="Настройки отображения"><Button ref={displayButton} size="sm" variant="quiet" className="bgd-map-icon" aria-label="Настройки отображения карты" aria-expanded={displayOpen} aria-controls="bgd-map-display-settings" onClick={() => setDisplayOpen(open => !open)}><MoreHorizontal size={19} /></Button></Tooltip>
          {displayOpen && <div id="bgd-map-display-settings" className="bgd-map-display__panel" role="group" aria-label="Настройки отображения карты"><strong>Отображение карты</strong><Switch label="Номера на текущем масштабе" checked={forceLabels} onChange={setForceLabels} /><Switch label="Отображать карту" checked={topography} onChange={setTopography} /><Switch label="Отображать сетку" checked={grid} onChange={setGrid} /></div>}
        </div>
      </div>
    </div>
    {visible.length === 0 && <div className="bgd-map-empty" role="status">По выбранным условиям скважины не найдены. <button type="button" onClick={reset}>Сбросить фильтры</button></div>}
    <MapCanvas selected={focusWell?.id} hideDemoLabel forceWellLabels={forceLabels} highlightWellsOnHover project={scene} camera={camera} onCamera={setCamera} tool="select" editable={false} draft={null} topography={topography} snap={p => p} onSelect={ids => { if (ids[0]) onOpenWell?.(ids[0]) }} onDraft={noop} onPoint={noop} onNode={noop} onCancel={noop} grid={grid} labels values={false} measure={[]} />
  </section>
}
