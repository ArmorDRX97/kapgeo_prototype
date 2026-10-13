import { useEffect, useState } from 'react'
import type { SectionLayer } from '../../../entities/geology-section/model/types'

type ViewPreferences = { zoom: number; ratio: number; grid: boolean; graphics: boolean; layers: SectionLayer[] }
export function useSectionView(sectionId: string, available: SectionLayer[], preset?: string) {
  const key = `kapgeo.sections.view.v1:${sectionId}:${available.join(',')}${preset ? `:${preset}` : ''}`
  const [view, setView] = useState<ViewPreferences>(() => {
    const fallback: ViewPreferences = { zoom: 1, ratio: 1, grid: true, graphics: true, layers: available }
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (!saved || typeof saved !== 'object') return fallback
      const p = saved as Partial<ViewPreferences>
      return { zoom: typeof p.zoom === 'number' && p.zoom >= .5 && p.zoom <= 4 ? p.zoom : 1, ratio: [.6, 1, 1.5, 2].includes(p.ratio ?? 0) ? p.ratio! : 1, grid: p.grid !== false, graphics: p.graphics !== false, layers: Array.isArray(p.layers) ? available.filter(layer => p.layers!.includes(layer)) : available }
    } catch { return fallback }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(view)) } catch { /* A view preference failure must not erase or block the section document. */ } }, [key, view])
  return [view, setView] as const
}
