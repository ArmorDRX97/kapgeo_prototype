import { Link } from '@tanstack/react-router'
import type { Well } from '../../../entities/well/model/types'
import { cx } from '../../../shared/lib/cx'

const statusTone: Record<Well['status'], string> = {
  'Работает': 'success',
  'На проверке': 'info',
  'Отключена': 'neutral',
  'Требует внимания': 'warning',
}

const qualityTone: Record<Well['quality'], string> = {
  'Высокое': 'success',
  'Среднее': 'info',
  'Есть проблемы': 'warning',
}

export function WellMap({ wells, compact = false, selectedId, onSelect, showLabels = true, showContours = true, colorBy = 'status' }: {
  wells: Well[]
  compact?: boolean
  selectedId?: string
  onSelect?: (well: Well) => void
  showLabels?: boolean
  showContours?: boolean
  colorBy?: 'status' | 'quality'
}) {
  return (
    <div className={`well-map${compact ? ' well-map--compact' : ''}`}>
      <div className="well-map__terrain" aria-hidden="true" />
      {showContours && <><div className="well-map__contour well-map__contour--a" aria-hidden="true" /><div className="well-map__contour well-map__contour--b" aria-hidden="true" /><div className="well-map__label well-map__label--a">BLK-07-12</div><div className="well-map__label well-map__label--b">BLK-07-13</div></>}
      {wells.map((well) => {
        const markerClass = cx('well-marker', `well-marker--${colorBy === 'quality' ? qualityTone[well.quality] : statusTone[well.status]}`, selectedId === well.id && 'is-selected')
        const markerContent = <><span />{!compact && showLabels && <small>{well.code.replace('WELL-', '')}</small>}</>
        const markerProps = { className: markerClass, style: { left: `${well.mapPosition.x}%`, top: `${well.mapPosition.y}%` }, 'aria-label': `${well.code}, ${well.type}, ${well.status}` }

        return onSelect
          ? <button type="button" key={well.id} {...markerProps} onClick={() => onSelect(well)}>{markerContent}</button>
          : <Link key={well.id} to="/objects/wells/$wellId" params={{ wellId: well.id }} {...markerProps}>{markerContent}</Link>
      })}
      <div className="well-map__controls"><button aria-label="Увеличить">+</button><button aria-label="Уменьшить">−</button></div>
      <div className="well-map__scale">100 м</div>
      <div className="well-map__legend">{colorBy === 'status' ? <><span><i className="legend-dot legend-dot--success" /> Работает</span><span><i className="legend-dot legend-dot--warning" /> Внимание</span><span><i className="legend-dot legend-dot--info" /> Проверка</span></> : <><span><i className="legend-dot legend-dot--success" /> Высокое</span><span><i className="legend-dot legend-dot--info" /> Среднее</span><span><i className="legend-dot legend-dot--warning" /> Проблемы</span></>}</div>
    </div>
  )
}
