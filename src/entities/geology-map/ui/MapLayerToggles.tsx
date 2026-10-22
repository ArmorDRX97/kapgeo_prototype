import { Tooltip } from '../../../shared/ui/Tooltip'
import './map-layer-toggles.css'

export function MapLayerToggles({ topography, grid, onTopography, onGrid }: { topography: boolean; grid: boolean; onTopography: (value: boolean) => void; onGrid: (value: boolean) => void }) {
  return <div className="map-layer-toggles" role="group" aria-label="Подложки карты"><Tooltip content="Топографическая подложка OpenTopoMap"><label><input type="checkbox" aria-label="OpenTopoMap" checked={topography} onChange={e => onTopography(e.target.checked)} />Карта</label></Tooltip><Tooltip content="Координатная сетка"><label><input type="checkbox" aria-label="Сетка" checked={grid} onChange={e => onGrid(e.target.checked)} />Сетка</label></Tooltip></div>
}
