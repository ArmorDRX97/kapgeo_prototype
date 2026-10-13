import type { PlotHeaders } from '../model/plotHeaders'

export function PlotColumnHeaders({ layout, clipId }: { layout: PlotHeaders; clipId: string }) {
  return <g className="section-canvas__headers" clipPath={`url(#${clipId})`} aria-label="Подписи скважин">
    <g className="section-canvas__header-leaders" aria-hidden="true">{layout.cards.map(card => {
      const center = (card.from + card.to) / 2, bottom = layout.top - 3, junction = bottom - 8
      return <path key={card.id} data-header-anchor={card.id} data-column-x={card.anchor} d={`M${card.x + card.width / 2} ${card.y + card.height}V${junction - 4}L${center} ${junction}V${bottom}M${card.from} ${bottom}V${junction}H${card.to}V${bottom}`} />
    })}</g>
    {layout.cards.map(card => <g key={card.id} data-header-well={card.id} role="group" aria-label={`${card.name}: колонки разреза`}>
      <rect x={card.x} y={card.y} width={card.width} height={card.height} rx="4" className="section-canvas__header-card" />
      <text x={card.x + card.width / 2} y={card.y + 20} textAnchor="middle" className="section-canvas__well-label">{card.name}</text>
    </g>)}
  </g>
}
