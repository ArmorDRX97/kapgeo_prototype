import { geologyHatches, type GeologyHatch as Hatch } from '../scientific/geology/standard16'

export function GeologyHatch({ id, hatch, background, scale = 1 }: {
  id: string; hatch: Hatch; background?: string; scale?: number
}) {
  const { size, line, dots } = geologyHatches[hatch]
  return <pattern id={id} width={size * scale} height={size * scale} viewBox={`0 0 ${size} ${size}`} patternUnits="userSpaceOnUse">
    {background && <rect width={size} height={size} fill={background} />}
    {line && <path d={line} fill="none" stroke="#26313b" strokeWidth=".75" />}
    {dots && <path d={dots} fill="#26313b" />}
  </pattern>
}
