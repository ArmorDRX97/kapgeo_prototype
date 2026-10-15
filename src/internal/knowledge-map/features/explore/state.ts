import { z } from 'zod'
import { MODES, NODE_TYPES, EDGE_TYPES } from '../../entities/knowledge/schema'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import { ancestors, type GraphFilter } from '../../entities/knowledge/graph'

export const STORAGE_KEY = 'kapgeo.knowledge-map.v1'
const viewport = z.object({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().min(0.1).max(3) })
const point = z.object({ x: z.number().finite(), y: z.number().finite() })
const location = z.object({ selected: z.string().nullable(), mode: z.enum(MODES), expanded: z.array(z.string()).max(30) })
export const stateSchema = location.extend({
  version: z.literal(1), compact: z.boolean(), focus: z.boolean(), depth: z.union([z.literal(1), z.literal(2)]),
  filter: z.object({ types: z.array(z.enum(NODE_TYPES)), categories: z.array(z.string()), relations: z.array(z.enum(EDGE_TYPES)) }),
  pinned: z.array(z.string()).max(6), history: z.array(location).max(40), future: z.array(location).max(40),
  progress: z.record(z.string(), z.object({ step: z.number().int().nonnegative(), completed: z.boolean() })),
  activeTour: z.string().nullable(), viewports: z.record(z.string(), viewport), positions: z.record(z.string(), z.record(z.string(), point)),
})
export type ExplorerState = z.infer<typeof stateSchema>
export type Visit = z.infer<typeof location>
export const emptyFilter: GraphFilter = { types: [], categories: [], relations: [] }
export function defaultState(): ExplorerState {
  return { version: 1, mode: 'processes', selected: null, expanded: [], compact: false, focus: false, depth: 1,
    filter: emptyFilter, pinned: [], history: [], future: [], progress: {}, activeTour: null, viewports: {}, positions: {} }
}
export function readState(index: KnowledgeIndex, storage?: Pick<Storage, 'getItem'>): { state: ExplorerState; warning: boolean } {
  let state = defaultState(), warning = false
  try {
    const saved = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    if (saved) state = stateSchema.parse(JSON.parse(saved))
  } catch { warning = true }
  state.expanded = state.expanded.filter(id => index.byId.has(id))
  state.pinned = state.pinned.filter(id => index.byId.has(id))
  if (state.selected && !index.byId.has(state.selected)) state.selected = null
  if (state.activeTour && !index.learningPaths.some(p => p.id === state.activeTour)) state.activeTour = null
  for (const [id, progress] of Object.entries(state.progress)) {
    const path = index.learningPaths.find(p => p.id === id)
    if (!path) delete state.progress[id]
    else progress.step = Math.min(progress.step, path.steps.length - 1)
  }
  state.filter.categories = state.filter.categories.filter(id => index.byCategory.has(id))
  return { state, warning }
}
export function readUrl(index: KnowledgeIndex, hash: string): Visit | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const nodeId = params.get('node'), mode = params.get('mode')
  if (!nodeId && !mode) return null
  const selected = nodeId && index.byId.has(nodeId) ? nodeId : null
  return { selected, mode: MODES.includes(mode as ExplorerState['mode']) ? mode as ExplorerState['mode'] : 'processes', expanded: selected ? index.byId.get(selected)?.type === 'domain' ? [selected] : ancestors(index, selected) : [] }
}
export function locationOf(state: ExplorerState): Visit {
  return { selected: state.selected, mode: state.mode, expanded: state.expanded }
}
export function visit(state: ExplorerState, next: Visit): ExplorerState {
  if (state.selected === next.selected && state.mode === next.mode && state.expanded.join() === next.expanded.join()) return state
  return { ...state, ...next, focus: false, filter: emptyFilter, history: [...state.history, locationOf(state)].slice(-40), future: [] }
}
export function travel(state: ExplorerState, direction: 'back' | 'forward'): ExplorerState {
  const stack = direction === 'back' ? state.history : state.future
  const next = stack.at(-1)
  if (!next) return state
  return direction === 'back'
    ? { ...state, ...next, focus: false, activeTour: null, filter: emptyFilter, history: stack.slice(0, -1), future: [...state.future, locationOf(state)].slice(-40) }
    : { ...state, ...next, focus: false, activeTour: null, filter: emptyFilter, future: stack.slice(0, -1), history: [...state.history, locationOf(state)].slice(-40) }
}
export function stateHash(state: Pick<ExplorerState, 'mode' | 'selected'>): string {
  const params = new URLSearchParams({ mode: state.mode })
  if (state.selected) params.set('node', state.selected)
  return `#${params.toString()}`
}
export function saveState(state: ExplorerState, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(state)); return true } catch { return false }
}
