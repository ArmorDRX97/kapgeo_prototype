import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { validateInterpretationSearch, type InterpretationSearch } from '../interpretation/model/search'
import { validateSectionSearch, type SectionSearch } from '../geology-sections/model/search'
import { validateAlphaSearch, type AlphaSearch } from '../interpretation/alpha/search'
import { alphaNames } from '../../entities/interpretation/model/alphaTypes'

const KEY = 'kapgeo.geology.navigation.v1'
const SECTION_KEY = 'kapgeo.geology.section-navigation.v1'
const ALPHA_KEY = 'kapgeo.geology.alpha-navigation.v1'
function rememberedAlpha(): { method: string; search: AlphaSearch } | null {
  try { const value = JSON.parse(sessionStorage.getItem(ALPHA_KEY) ?? 'null'); return value && typeof value.method === 'string' && Object.hasOwn(alphaNames, value.method) ? { method: value.method, search: validateAlphaSearch(value.search ?? {}) } : null } catch { return null }
}
function rememberedSection(): { id: string; search: SectionSearch } | null {
  try { const s: unknown = JSON.parse(sessionStorage.getItem(SECTION_KEY) ?? 'null'); if (s && typeof s === 'object' && 'id' in s && typeof s.id === 'string' && 'search' in s && s.search && typeof s.search === 'object') return { id: s.id, search: validateSectionSearch(s.search as Record<string, unknown>) }; return null } catch { return null }
}
function rememberedInterpretation(): InterpretationSearch {
  try { return validateInterpretationSearch(JSON.parse(sessionStorage.getItem(KEY) ?? '{}')) } catch { return {} }
}

/** Shell-level links preserve local return context; workbenches own dirty guards. */
export function useGeologyNavigation() {
  const location = useRouterState({ select: state => state.location })
  const interpretation = location.pathname.startsWith('/geology/interpretation')
  const alpha = location.pathname.startsWith('/geology/interpretation/') && Object.hasOwn(alphaNames, location.pathname.split('/').at(-1)!)
  const previousAlpha = rememberedAlpha()
  const alphaContext = alpha ? { method: location.pathname.split('/').at(-1)!, search: validateAlphaSearch(location.search) } : !interpretation ? previousAlpha : null
  const remembered = rememberedSection()
  useEffect(() => {
    if (alpha) {
      try { sessionStorage.setItem(ALPHA_KEY, JSON.stringify({ method: location.pathname.split('/').at(-1), search: validateAlphaSearch(location.search) })) } catch { /* Optional return context. */ }
    } else if (interpretation && location.pathname === '/geology/interpretation') {
      try { sessionStorage.setItem(KEY, JSON.stringify(validateInterpretationSearch(location.search))); sessionStorage.removeItem(ALPHA_KEY) } catch { /* Navigation works without storage. */ }
    } else if (location.pathname.startsWith('/geology/sections/')) {
      try { sessionStorage.setItem(SECTION_KEY, JSON.stringify({ id: location.pathname.split('/').at(-1), search: validateSectionSearch(location.search) })) } catch { /* Optional return context. */ }
    }
  }, [interpretation, alpha, location.search, location.pathname])
  return { section: location.pathname.startsWith('/geology/sections/') ? { id: location.pathname.split('/').at(-1)!, search: validateSectionSearch(location.search) } : remembered,
    alpha: alphaContext, legacy: interpretation ? validateInterpretationSearch(location.search) : rememberedInterpretation() }
}
