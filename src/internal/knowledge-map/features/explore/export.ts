import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'

export async function exportMap(container: HTMLElement, nodes: Node[], format: 'png' | 'svg') {
  const viewport = container.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewport || !nodes.length) throw new Error('На карте нет элементов для экспорта.')
  const { toPng, toSvg } = await import('html-to-image')
  const bounds = getNodesBounds(nodes)
  const width = 1800, height = 1200
  const transform = getViewportForBounds(bounds, width, height, 0.1, 2, 0.12)
  const backgroundColor = getComputedStyle(container).getPropertyValue('--canvas').trim() || 'white'
  const url = await (format === 'png' ? toPng : toSvg)(viewport, {
    width, height, backgroundColor, pixelRatio: 1.5, skipFonts: true,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})` },
  })
  const link = document.createElement('a')
  link.download = `kapgeo-knowledge-map.${format}`
  link.href = url
  link.click()
}
