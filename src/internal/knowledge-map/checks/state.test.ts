import { describe, expect, it } from 'vitest'
import { knowledge } from '../entities/knowledge/model'
import { defaultState, readState, readUrl, saveState, stateHash, travel, visit, STORAGE_KEY } from '../features/explore/state'

describe('Navigation and safe browser persistence', () => {
  it('restores browser state including viewport, dragged position and learning progress', () => {
    const storage = new Map<string, string>()
    const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value) } }
    const state = { ...defaultState(), compact: true, viewports: { map: { x: 20, y: 40, zoom: 0.7 } }, positions: { map: { logging: { x: 150, y: 20 } } }, progress: { 'well-life': { step: 3, completed: false } } }
    expect(saveState(state, adapter)).toBe(true)
    expect(readState(knowledge, adapter).state).toEqual(state)
  })
  it('survives corrupt JSON, old schemas and storage denial', () => {
    expect(readState(knowledge, { getItem: () => '{broken' }).warning).toBe(true)
    expect(readState(knowledge, { getItem: () => '{"version":0}' }).state).toEqual(defaultState())
    expect(readState(knowledge, { getItem: () => { throw new Error('Denied') } }).warning).toBe(true)
    expect(saveState(defaultState(), { setItem: () => { throw new Error('Quota') } })).toBe(false)
  })
  it('removes stale IDs and clamps route progress after content updates', () => {
    const saved = { ...defaultState(), selected: 'obsolete', pinned: ['obsolete', 'logging'], expanded: ['obsolete'], progress: { 'well-life': { step: 500, completed: false } } }
    const result = readState(knowledge, { getItem: key => key === STORAGE_KEY ? JSON.stringify(saved) : null }).state
    expect(result.selected).toBeNull()
    expect(result.pinned).toEqual(['logging'])
    expect(result.expanded).toHaveLength(0)
    expect(result.progress['well-life']?.step).toBe(7)
  })
  it('goes backward and forward through actual contexts', () => {
    const state = visit(defaultState(), { mode: 'processes', selected: 'logging', expanded: ['research'] })
    const next = visit(state, { mode: 'specialists', selected: 'geologist', expanded: [] })
    const back = travel(next, 'back')
    expect(back.selected).toBe('logging')
    expect(back.mode).toBe('processes')
    expect(travel(back, 'forward').selected).toBe('geologist')
  })
  it('uses hash URLs that need no server routing and validates unknown IDs', () => {
    const hash = stateHash({ mode: 'data', selected: 'log-curves' })
    expect(readUrl(knowledge, hash)).toEqual({ mode: 'data', selected: 'log-curves', expanded: ['research', 'logging'] })
    expect(readUrl(knowledge, '#mode=invalid&node=missing')).toEqual({ mode: 'processes', selected: null, expanded: [] })
    expect(readUrl(knowledge, '')).toBeNull()
  })
})
