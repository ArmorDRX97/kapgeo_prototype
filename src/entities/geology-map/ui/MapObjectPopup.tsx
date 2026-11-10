import { useEffect, useState } from 'react'
import { ArrowUpRight, GripHorizontal, MapPin, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { kindNames, type MapObject } from '../model'
import { useMovablePopup } from '../../../shared/lib/useMovablePopup'
import './map-object-popup.css'

export type MapContextPoint = { x: number; y: number }
export function MapObjectPopup({ objects, at, onClose, onSelect, onOpenWell, getStatus }: {
  objects: MapObject[]; at: MapContextPoint; onClose: () => void; onSelect?: (id: string) => void;
  onOpenWell?: (id: string) => void; getStatus?: (object: MapObject) => string;
}) {
  const [selected, setSelected] = useState(objects[0]?.id)
  const object = objects.find(o => o.id === selected) ?? objects[0]
  const { ref, handle } = useMovablePopup(at, object?.id)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose() }
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('pointerdown', outside); previous?.focus({ preventScroll: true }) }
  }, [onClose, ref])
  if (!object) return null
  const point = object.parts[0]?.nodes[0]
  const status = getStatus?.(object) ?? (object.attributes.type === 'Проектная' ? 'На проверке' : 'Работает')
  return <div ref={ref} className={`map-object-popup${objects.length > 1 ? ' map-object-popup--choices' : ''}`} role="dialog" aria-label="Сведения об объекте карты" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }}>
    <header>
      <button type="button" className="map-object-popup__handle" aria-label={`Переместить карточку ${object.name} стрелками`} title="Перетащите карточку за заголовок или используйте стрелки"
        {...handle}><MapPin size={16} aria-hidden="true" /><strong>{object.name}</strong><GripHorizontal size={15} aria-hidden="true" /></button>
      <Button size="sm" variant="quiet" aria-label="Закрыть сведения об объекте" onClick={onClose}><X size={16} /></Button>
    </header>
    <div className="map-object-popup__body"><div>
      <dl><div><dt>{object.kind === 'well' ? 'Тип скважины' : 'Объект'}</dt><dd>{object.kind === 'well' ? object.attributes.type || 'Не указан' : kindNames[object.kind]}</dd></div>
        {object.kind === 'well' && <div><dt>Статус</dt><dd><span className="map-object-popup__status">{status}</span></dd></div>}
      </dl>
      {point && <dl className="map-object-popup__coordinates"><div><dt>X, м</dt><dd>{point.x.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div><div><dt>Y, м</dt><dd>{point.y.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div></dl>}
      {object.kind === 'well' && onOpenWell && <Button size="sm" className="map-object-popup__open" onClick={() => onOpenWell(object.id)}>Перейти к скважине<ArrowUpRight size={15} /></Button>}
    </div>{objects.length > 1 && <div className="map-object-popup__choices"><strong>Объекты в этой точке</strong>{objects.map(o => <Button key={o.id} size="sm" variant={o.id === object.id ? 'primary' : 'secondary'} aria-pressed={o.id === object.id} onClick={() => { setSelected(o.id); onSelect?.(o.id) }}>{kindNames[o.kind]} · {o.name}</Button>)}</div>}</div>
  </div>
}
