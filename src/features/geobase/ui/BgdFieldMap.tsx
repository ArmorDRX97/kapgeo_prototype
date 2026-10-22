import { useEffect, useMemo, useState } from 'react'
import { Maximize2, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { MapLayerToggles } from '../../../entities/geology-map/ui/MapLayerToggles'
import { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import { WellTypeFilters } from '../../../entities/geology-map/ui/WellTypeFilters'
import { type Camera } from '../../../entities/geology-map/geometry'
import { Button } from '../../../shared/ui/Button'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { bgdOnlyWells, filterBgdWells, useBgdFieldFilters } from '../model/bgdField'
import './bgd-field-map.css'

const noop = () => {}
function MapControl({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <Tooltip content={label}><Button size="sm" variant="quiet" className="bgd-map-icon" aria-label={label} onClick={onClick}><Icon size={17} /></Button></Tooltip>
}
function rememberedView(depositId: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`kapgeo.bgd.map-view.${depositId}`) ?? '{}')
    const camera = value.camera && [value.camera.x, value.camera.y, value.camera.scale].every(Number.isFinite) && value.camera.scale >= .001 && value.camera.scale <= 80 ? value.camera as Camera : null
    return { camera, topography: value.topography !== false, grid: value.grid !== false }
  } catch { return { camera: null, topography: true, grid: true } }
}
export function BgdFieldMap({ depositId, onOpenWell }: { depositId: string; onOpenWell?: (id: string) => void }) {
  const { filters, setFilters, reset } = useBgdFieldFilters(depositId)
  const [initial] = useState(() => rememberedView(depositId))
  const [camera, setCamera] = useState<Camera | null>(initial.camera), [topography, setTopography] = useState(initial.topography), [grid, setGrid] = useState(initial.grid)
  useEffect(() => { try { sessionStorage.setItem(`kapgeo.bgd.map-view.${depositId}`, JSON.stringify({ camera, topography, grid })) } catch { /* Optional view state. */ } }, [depositId, camera, topography, grid])
  const { scene, typeScope } = useMemo(() => ({ scene: bgdOnlyWells(filterBgdWells(filters)), typeScope: filterBgdWells({ ...filters, hiddenTypes: [] }) }), [filters])
  const visible = scene.objects
  return <section className="bgd-field-map" aria-label="Карта скважин месторождения">
    <div className="bgd-field-toolbar" data-tooltip-group><div><MapControl icon={ZoomIn} label="Приблизить карту скважин" onClick={() => camera && setCamera({ ...camera, scale: Math.min(80, camera.scale * 1.5) })} /><MapControl icon={ZoomOut} label="Отдалить карту скважин" onClick={() => camera && setCamera({ ...camera, scale: Math.max(.01, camera.scale / 1.5) })} /><MapControl icon={Maximize2} label="Всё месторождение" onClick={() => setCamera(null)} /><span>{visible.length.toLocaleString('ru-RU')} скважин</span></div><MapLayerToggles topography={topography} grid={grid} onTopography={setTopography} onGrid={setGrid} /></div>
    <WellTypeFilters compact objects={typeScope} hidden={filters.hiddenTypes} onChange={hiddenTypes => setFilters({ hiddenTypes })} />
    {visible.length === 0 && <div className="bgd-map-empty" role="status">По выбранным условиям скважины не найдены. <button type="button" onClick={reset}>Сбросить фильтры</button></div>}
    <MapCanvas highlightWellsOnHover project={scene} camera={camera} onCamera={setCamera} tool="select" editable={false} draft={null} topography={topography} snap={p => p} onSelect={ids => { if (ids[0]) onOpenWell?.(ids[0]) }} onDraft={noop} onPoint={noop} onNode={noop} onCancel={noop} grid={grid} labels values={false} measure={[]} />
  </section>
}
