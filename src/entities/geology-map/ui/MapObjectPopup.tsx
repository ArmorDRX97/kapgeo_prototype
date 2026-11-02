import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, MapPin, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { kindNames, type MapObject } from '../model'
import './map-object-popup.css'

export type MapContextPoint = { x: number; y: number }
export function MapObjectPopup({ objects, at, onClose, onSelect, onOpenWell, getStatus }: {
  objects: MapObject[]; at: MapContextPoint; onClose: () => void; onSelect?: (id: string) => void;
  onOpenWell?: (id: string) => void; getStatus?: (object: MapObject) => string;
}) {
  const [selected, setSelected] = useState(objects[0]?.id)
  const object = objects.find(o => o.id === selected) ?? objects[0]
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: at.x + 12, top: at.y + 12 })
  useLayoutEffect(() => {
    const bounds = ref.current?.getBoundingClientRect()
    if (bounds) setPosition({ left: Math.max(12, Math.min(at.x + 12, window.innerWidth - bounds.width - 12)), top: Math.max(12, Math.min(at.y + 12, window.innerHeight - bounds.height - 12)) })
  }, [at, objects.length, selected])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose() }
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('pointerdown', outside); previous?.focus({ preventScroll: true }) }
  }, [onClose])
  if (!object) return null
  const point = object.parts[0]?.nodes[0]
  const status = getStatus?.(object) ?? (object.attributes.type === 'Проектная' ? 'На проверке' : 'Работает')
  return <div ref={ref} className={`map-object-popup${objects.length > 1 ? ' map-object-popup--choices' : ''}`} role="dialog" aria-label="Сведения об объекте карты" style={position} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }}>
    <header><span><MapPin size={18} /><strong>{object.name}</strong></span><Button size="sm" variant="quiet" aria-label="Закрыть сведения об объекте" onClick={onClose}><X size={17} /></Button></header>
    <div className="map-object-popup__body"><div>
      <dl><div><dt>{object.kind === 'well' ? 'Тип скважины' : 'Объект'}</dt><dd>{object.kind === 'well' ? object.attributes.type || 'Не указан' : kindNames[object.kind]}</dd></div>
        {object.kind === 'well' && <div><dt>Статус</dt><dd><span className="map-object-popup__status">{status}</span></dd></div>}
        {point && <><div><dt>X, м</dt><dd>{point.x.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div><div><dt>Y, м</dt><dd>{point.y.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div></>}
      </dl>
      {object.kind === 'well' && onOpenWell && <Button size="sm" className="map-object-popup__open" onClick={() => onOpenWell(object.id)}>Перейти к скважине<ArrowUpRight size={15} /></Button>}
    </div>{objects.length > 1 && <div className="map-object-popup__choices"><strong>Объекты в этой точке</strong>{objects.map(o => <Button key={o.id} size="sm" variant={o.id === object.id ? 'primary' : 'secondary'} aria-pressed={o.id === object.id} onClick={() => { setSelected(o.id); onSelect?.(o.id) }}>{kindNames[o.kind]} · {o.name}</Button>)}</div>}</div>
  </div>
}
