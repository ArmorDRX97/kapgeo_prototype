import { useId } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { segmentRadius, withSegmentRadius } from '../../../entities/geology-section/lib/segmentRadius'
import './segment-radius.css'

export function SegmentRadiusControl({ section, segmentId, index, disabled, onChange }: { section: GeologySection; segmentId: string; index: number; disabled: boolean; onChange: (section: GeologySection) => void }) {
  const id = useId(), value = segmentRadius(section, segmentId)
  return <section className="section-segment-radius" aria-label={`Зона захвата сегмента ${index + 1}`}><header><strong>Зона захвата</strong><span>Сегмент {index + 1}</span></header><label htmlFor={id}>Радиус захвата, м</label><div className="section-segment-radius__input"><input id={id} aria-describedby={`${id}-hint`} type="number" min="0" max="100000" step="5" value={value} disabled={disabled} onChange={e => { const next = e.currentTarget.valueAsNumber; if (Number.isFinite(next) && next >= 0 && next <= 100000) onChange(withSegmentRadius(section, segmentId, next)) }} /><span>в каждую сторону</span></div><p id={`${id}-hint`}>Полная ширина — {(value * 2).toLocaleString('ru-RU')} м. Состав скважин не меняется автоматически.</p></section>
}
