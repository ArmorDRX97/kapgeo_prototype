import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { kindNames, type MapProject } from '../../entities/geology-map/model'

export function MapLayerTree({ project, selected, layerId, onLayer, onSelect, onChange, disabled }: { project: MapProject; selected?: string; layerId: string; onLayer: (id: string) => void; onSelect: (id: string) => void; onChange: (p: MapProject) => void; disabled: boolean }) {
  const [expanded, setExpanded] = useState<{ selection?: string; layers: Record<string, boolean> }>({ layers: {} })
  const [limits, setLimits] = useState<Record<string, number>>({})
  const overrides = expanded.selection === selected ? expanded.layers : {}
  const render = (parentId: string | null, depth = 0): React.ReactNode => project.layers.filter(layer => layer.parentId === parentId).map(layer => {
    const objects = project.objects.filter(object => object.layerId === layer.id)
    const open = overrides[layer.id] ?? objects.some(object => object.id === selected)
    const limit = limits[layer.id] ?? 80, shown = objects.slice(0, limit)
    const selectedObject = objects.find(o => o.id === selected)
    if (selectedObject && !shown.includes(selectedObject)) shown.push(selectedObject)
    return <div key={layer.id} className="map-tree-group" style={{ '--tree-depth': depth } as React.CSSProperties}>
      <div className={`map-layer-row${layer.id === layerId ? ' is-selected' : ''}`}>
        <input aria-label={`Видимость слоя ${layer.name}`} type="checkbox" checked={layer.visible} disabled={disabled} onChange={event => onChange({ ...project, layers: project.layers.map(item => item.id === layer.id ? { ...item, visible: event.target.checked } : item) })} />
        {objects[0] && <i aria-hidden="true" className="map-layer-color" style={{ background: objects[0].style.stroke }} />}
        <button type="button" onClick={() => onLayer(layer.id)} aria-pressed={layer.id === layerId} title={layer.name}>{layer.name}</button>
        <span title={`${objects.length} объектов`}>{objects.length}</span>{layer.locked && <LockKeyhole size={13} aria-label="Слой заблокирован" />}
      </div>
      <details open={open}>
        <summary className="map-tree-count" onClick={event => { event.preventDefault(); setExpanded({ selection: selected, layers: { ...overrides, [layer.id]: !open } }) }}>Объекты · {objects.length}</summary>
        <div className="map-tree-objects">{(open ? shown : []).map(object => <button key={object.id} type="button" className={object.id === selected ? 'is-selected' : ''} aria-pressed={object.id === selected} onClick={() => onSelect(object.id)} title={`${kindNames[object.kind]}: ${object.name}`}><span className="map-object-swatch" style={{ background: object.style.stroke }} /><span>{object.name}</span>{object.id === selected && <i aria-hidden="true" className="map-selection-dot" />}</button>)}{open && objects.length > limit && <button type="button" onClick={() => setLimits({ ...limits, [layer.id]: limit + 80 })}>Ещё {Math.min(80, objects.length - limit)} из {objects.length}</button>}{!objects.length && <p className="map-muted">В слое пока нет объектов.</p>}</div>
      </details>{render(layer.id, depth + 1)}
    </div>
  })
  return <div className="map-tree" aria-label="Слои и объекты плана">{render(null)}</div>
}
