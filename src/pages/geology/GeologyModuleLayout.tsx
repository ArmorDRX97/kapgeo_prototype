import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, type PropsWithChildren } from 'react'
import { Layers3, ScanLine } from 'lucide-react'
import { validateInterpretationSearch, type InterpretationSearch } from '../../features/interpretation/model/search'
import { validateSectionSearch, type SectionSearch } from '../../features/geology-sections/model/search'
import { validateAlphaSearch, type AlphaSearch } from '../../features/interpretation/alpha/search'
import { alphaNames } from '../../entities/interpretation/model/alphaTypes'
import './geology-module.css'

const KEY = 'kapgeo.geology.navigation.v1'
const SECTION_KEY = 'kapgeo.geology.section-navigation.v1'
const ALPHA_KEY = 'kapgeo.geology.alpha-navigation.v1'
function rememberedAlpha(): { method: string; search: AlphaSearch } | null {
  try { const value = JSON.parse(sessionStorage.getItem(ALPHA_KEY) ?? 'null'); return value && typeof value.method === 'string' && value.method in alphaNames ? { method: value.method, search: validateAlphaSearch(value.search ?? {}) } : null } catch { return null }
}
function rememberedSection(): { id: string; search: SectionSearch } | null {
  try { const s: unknown = JSON.parse(sessionStorage.getItem(SECTION_KEY) ?? 'null'); if (s && typeof s === 'object' && 'id' in s && typeof s.id === 'string' && 'search' in s && s.search && typeof s.search === 'object') return { id: s.id, search: validateSectionSearch(s.search as Record<string, unknown>) }; return null } catch { return null }
}
function rememberedInterpretation(): InterpretationSearch {
  try { return validateInterpretationSearch(JSON.parse(sessionStorage.getItem(KEY) ?? '{}')) } catch { return {} }
}

/** Shell-level links preserve local return context; workbenches own dirty guards. */
export function GeologyModuleNavigation() {
  const location = useRouterState({ select: state => state.location })
  const interpretation = location.pathname.startsWith('/geology/interpretation')
  const alpha = location.pathname.startsWith('/geology/interpretation/')
  const previousAlpha = rememberedAlpha()
  const alphaContext = alpha ? { method: location.pathname.split('/').at(-1)!, search: validateAlphaSearch(location.search) } : !interpretation ? previousAlpha : null
  const remembered = rememberedSection()
  useEffect(() => {
    if (alpha) {
      try { sessionStorage.setItem(ALPHA_KEY, JSON.stringify({ method: location.pathname.split('/').at(-1), search: validateAlphaSearch(location.search) })) } catch { /* Optional return context. */ }
    } else if (interpretation) {
      try { sessionStorage.setItem(KEY, JSON.stringify(validateInterpretationSearch(location.search))); sessionStorage.removeItem(ALPHA_KEY) } catch { /* Navigation works without storage. */ }
    } else if (location.pathname.startsWith('/geology/sections/')) {
      try { sessionStorage.setItem(SECTION_KEY, JSON.stringify({ id: location.pathname.split('/').at(-1), search: validateSectionSearch(location.search) })) } catch { /* Optional return context. */ }
    }
  }, [interpretation, alpha, location.search, location.pathname])
  return <nav className="geology-module__navigation" aria-label="Подмодули геологии">
      {interpretation && remembered ? <Link to="/geology/sections/$sectionId" params={{ sectionId: remembered.id }} search={remembered.search}><Layers3 size={17} />Геотехнологические разрезы</Link> : <Link to="/geology/sections" aria-current={!interpretation ? 'page' : undefined}><Layers3 size={17} />Геотехнологические разрезы</Link>}
      {alphaContext ? <Link to="/geology/interpretation/$method" params={{ method: alphaContext.method }} search={alphaContext.search} aria-current={interpretation ? 'page' : undefined}><ScanLine size={17} />Интерпретация</Link> : <Link to="/geology/interpretation" search={interpretation ? validateInterpretationSearch(location.search) : rememberedInterpretation()} aria-current={interpretation ? 'page' : undefined}><ScanLine size={17} />Интерпретация</Link>}
    </nav>
}

export function GeologyModuleLayout({ children }: PropsWithChildren) {
  return <div className="geology-module">{children}</div>
}
