import { plotMargin } from '../geometry'

// Screen ratios use CSS reference pixels. The ruler itself measures map coordinates.
const cssPixelsPerMeter = 96 / 0.0254
const scalePresets = [50, 100, 200, 500, 1000, 2000, 2500, 5000, 10000, 25000, 50000, 100000, 250000]
const scaleNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })

export function MapScaleSelector({ pixelsPerMeter, onScale }: { pixelsPerMeter: number; onScale: (pixelsPerMeter: number) => void }) {
  const ratio = Math.round(cssPixelsPerMeter / pixelsPerMeter)
  const options = scalePresets.includes(ratio) ? scalePresets : [...scalePresets, ratio].sort((a, b) => a - b)
  return <label className="map-scale-selector" title="Экранный масштаб по CSS. Масштаб печати задаётся при экспорте.">
    <span>Масштаб</span>
    <select aria-label="Экранный масштаб" value={ratio} onChange={event => onScale(cssPixelsPerMeter / Number(event.target.value))}>
      {options.map(value => <option key={value} value={value}>1:{scaleNumber.format(value)}</option>)}
    </select>
  </label>
}

export function MapScaleBar({ pixelsPerMeter, width, height }: { pixelsPerMeter: number; width: number; height: number }) {
  const x = plotMargin.left + 16
  const y = height - plotMargin.bottom - 14
  const available = width - plotMargin.right - x - 34
  if (available < 65 || y < plotMargin.top + 24) return null

  const limit = Math.min(156, available) / pixelsPerMeter
  const magnitude = 10 ** Math.floor(Math.log10(limit))
  const distance = ([5, 2, 1].find(step => step * magnitude <= limit) ?? 1) * magnitude
  const length = distance * pixelsPerMeter
  const formatDistance = (meters: number) => meters >= 1000 ? `${scaleNumber.format(meters / 1000)} км` : `${scaleNumber.format(meters)} м`
  const half = distance / 2

  return <g className="map-linear-scale" transform={`translate(${x},${y})`} role="img" aria-label={`Масштабная линейка · ${formatDistance(distance)}`} pointerEvents="none">
    <rect className="map-linear-scale__background" x={-7} y={-20} width={length + 41} height={29} rx={4} />
    <rect className="map-linear-scale__track" x={0} y={-4} width={length} height={6} />
    <rect className="map-linear-scale__fill" x={0} y={-4} width={length / 2} height={6} />
    <text x={0} y={-9} textAnchor="middle">0</text>
    {length >= 82 && <text x={length / 2} y={-9} textAnchor="middle">{scaleNumber.format(distance >= 1000 ? half / 1000 : half)}</text>}
    <text x={length} y={-9} textAnchor="middle">{formatDistance(distance)}</text>
  </g>
}
