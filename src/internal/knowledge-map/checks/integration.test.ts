import { describe, expect, it } from 'vitest'
import { knowledgeFramePath, knowledgeHostShareUrl, parseKnowledgeContext, safeReturnPath, validateKnowledgeSearch, KNOWLEDGE_MODES } from '../integration/protocol'
import { MODES } from '../entities/knowledge/schema'

describe('Isolated atlas navigation contract', () => {
  it('keeps the small shell contract aligned with the independent atlas model', () => {
    expect(KNOWLEDGE_MODES).toEqual(MODES)
    expect(parseKnowledgeContext({ mode: 'specialists', node: 'logging' })).toEqual({ mode: 'specialists', node: 'logging' })
    expect(parseKnowledgeContext({ mode: 'unknown' })).toBeNull()
    expect(parseKnowledgeContext(null)).toBeNull()
    expect(validateKnowledgeSearch({ mode: 'modules', node: '<script>', from: '//outside.test' })).toEqual({ mode: 'modules', node: undefined, from: undefined })
  })
  it('uses a local HTML entry under the same development and production base', () => {
    expect(knowledgeFramePath('/', { mode: 'data', node: 'logging' })).toBe('/internal/knowledge-map.html#mode=data&node=logging')
    expect(knowledgeFramePath('/kapgeo_prototype/', {})).toBe('/kapgeo_prototype/internal/knowledge-map.html')
  })
  it('shares the host route in browser-history and production-hash modes', () => {
    expect(knowledgeHostShareUrl('https://example.test/team/knowledge-map?from=%2Fadmin', { mode: 'data', node: 'logging' })).toBe('https://example.test/team/knowledge-map?mode=data&node=logging')
    expect(knowledgeHostShareUrl('https://example.test/kapgeo_prototype/#/team/knowledge-map?from=%2Fadmin&node=old', { mode: 'modules' })).toBe('https://example.test/kapgeo_prototype/#/team/knowledge-map?mode=modules')
  })
  it('returns to product context and rejects external, auth and recursive tool destinations', () => {
    const from = '/geology/bgd/DEP-SARYTAU/wells/WELL-1019?tab=lithology&view=composite'
    expect(safeReturnPath(from, '/profile')).toBe(from)
    for (const input of ['https://outside.test', '//outside.test', '/\\outside.test', '/auth/sign-in', '/team/knowledge-map', '/unknown', null]) expect(safeReturnPath(input, '/profile')).toBe('/profile')
  })
})
