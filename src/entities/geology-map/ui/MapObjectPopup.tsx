import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, GripHorizontal, MapPin, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { kindNames, type MapObject } from '../model'
import './map-object-popup.css'

export type MapContextPoint = { x: number; y: number }
type PopupPosition = { left: number; top: number }

function keepOnScreen(position: PopupPosition, popup: HTMLElement | null): PopupPosition {
  if (!popup) return position
  const { width, height } = popup.getBoundingClientRect()
  return {
    left: Math.max(12, Math.min(position.left, window.innerWidth - width - 12)),
    top: Math.max(12, Math.min(position.top, window.innerHeight - height - 12)),
  }
}

export function MapObjectPopup({ objects, at, onClose, onSelect, onOpenWell, getStatus }: {
  objects: MapObject[]; at: MapContextPoint; onClose: () => void; onSelect?: (id: string) => void;
  onOpenWell?: (id: string) => void; getStatus?: (object: MapObject) => string;
}) {
  const [selected, setSelected] = useState(objects[0]?.id)
  const object = objects.find(o => o.id === selected) ?? objects[0]
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const [position, setPosition] = useState<PopupPosition>({ left: at.x + 12, top: at.y + 12 })
  useLayoutEffect(() => {
    setPosition(keepOnScreen({ left: at.x + 12, top: at.y + 12 }, ref.current))
  }, [at.x, at.y])
  useLayoutEffect(() => {
    const clamp = () => setPosition(previous => {
      const next = keepOnScreen(previous, ref.current)
      return next.left === previous.left && next.top === previous.top ? previous : next
    })
    clamp()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [object?.id, objects.length])
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
    <header>
      <button type="button" className="map-object-popup__handle" aria-label={`Переместить карточку ${object.name} стрелками`} title="Перетащите карточку за заголовок или используйте стрелки"
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary) return
          drag.current = { pointerId: event.pointerId, offsetX: event.clientX - position.left, offsetY: event.clientY - position.top }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          const gesture = drag.current
          if (gesture?.pointerId !== event.pointerId) return
          setPosition(keepOnScreen({ left: event.clientX - gesture.offsetX, top: event.clientY - gesture.offsetY }, ref.current))
        }}
        onLostPointerCapture={() => { drag.current = null }}
        onKeyDown={event => {
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
          if (!direction) return
          event.preventDefault()
          const [x = 0, y = 0] = direction
          setPosition(previous => keepOnScreen({ left: previous.left + x * 16, top: previous.top + y * 16 }, ref.current))
        }}><MapPin size={16} aria-hidden="true" /><strong>{object.name}</strong><GripHorizontal size={15} aria-hidden="true" /></button>
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
