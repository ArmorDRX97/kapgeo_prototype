import { useMemo, useRef, useState } from 'react'
import { Crosshair, LocateFixed, ZoomIn, ZoomOut } from 'lucide-react'
import { fitCamera, type Camera } from '../../../entities/geology-map/geometry'
import { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import type { MapObject, MapProject, XY } from '../../../entities/geology-map/model'
import { profileVertexName } from '../model/sectionPlan'
import { SectionToolButton } from './SectionToolButton'

const samePoint = (point: XY) => point
const noop = () => {}

export function SectionConstructionMap({ scene, sampleProfile, points, pickingWells, radius, selectedWells, onPoint, onWell }: {
  scene: MapProject
  sampleProfile: MapObject
  points: XY[]
  pickingWells: boolean
  radius?: number
  selectedWells: string[]
  onPoint: (point: XY) => void
  onWell: (id: string) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const draft = useMemo<MapObject | null>(() => points.length ? {
    ...sampleProfile,
    name: 'Трасса нового разреза',
    parts: [{ id: 'section-construction-trace', nodes: points.map((point, index) => ({ ...point, id: `vertex-${index}` })) }],
  } : null, [points, sampleProfile])
  const [camera, setCamera] = useState<Camera>(() => fitCamera({ ...scene, objects: [draft ?? sampleProfile] }, { width: 850, height: 540 }))
  const fit = (objects: MapObject[]) => {
    const bounds = mapRef.current?.querySelector('.map-canvas-wrap')?.getBoundingClientRect()
    setCamera(fitCamera({ ...scene, objects }, { width: bounds?.width ?? 850, height: bounds?.height ?? 540 }))
  }

  return <div className="section-construction-map" ref={mapRef}>
    <div className="section-construction-map__tools" aria-label="Инструменты карты" role="group">
      <SectionToolButton icon={ZoomIn} variant="quiet" label="Приблизить карту" onClick={() => setCamera(current => ({ ...current, scale: Math.min(80, current.scale * 1.5) }))} />
      <SectionToolButton icon={ZoomOut} variant="quiet" label="Отдалить карту" onClick={() => setCamera(current => ({ ...current, scale: Math.max(.01, current.scale / 1.5) }))} />
      <SectionToolButton icon={Crosshair} variant="quiet" label={draft ? 'К трассе' : 'К участку построения'} onClick={() => fit([draft ?? sampleProfile])} />
      <SectionToolButton icon={LocateFixed} variant="quiet" label="Всё месторождение" onClick={() => fit(scene.objects)} />
    </div>
    <MapCanvas project={scene} camera={camera} onCamera={setCamera} selected={draft?.id} draft={draft}
      tool={pickingWells ? 'select' : 'draw'} editable={false} snap={samePoint} panWhileDrawing
      onSelect={ids => { if (pickingWells && ids[0] && ids[0] !== draft?.id) onWell(ids[0]) }}
      onPoint={onPoint} onNode={noop} onDraft={noop} onCancel={noop}
      onContextSelect={noop} grid labels={selectedWells.length <= 16} values={false} measure={[]} focusWellIds={selectedWells} highlightWellsOnHover={pickingWells} hideDemoLabel
      corridor={radius !== undefined ? { points, radius } : undefined}
      segmentAnnotations={points.slice(1).map((b, index) => ({ a: points[index]!, b, label: `Сегмент ${index + 1}` }))}
      vertexAnnotations={points.map((point, index) => ({ point, label: profileVertexName(index) }))}
    />
  </div>
}
