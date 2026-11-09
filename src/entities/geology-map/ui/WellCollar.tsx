import { wellMarkGeometry } from '../wellSymbols'

export function WellCollar({ type, x, y, radius, width = 1 }: {
  type: string; x: number; y: number; radius: number; width?: number
}) {
  const mark = wellMarkGeometry(type, x, y, radius)
  return <g data-well-symbol={mark.kind} stroke={mark.color} strokeWidth={width} aria-hidden="true">
    <path d={mark.outline} fill={mark.kind === 'solid' ? mark.color : '#ffffff'} />
    {mark.cross && <path d={mark.cross} fill="none" />}
    {mark.kind === 'dot' && <circle cx={x} cy={y} r={radius * .32} fill={mark.color} stroke="none" />}
  </g>
}
