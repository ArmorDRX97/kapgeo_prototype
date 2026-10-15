import type { KnowledgeIndex } from './model'
import type { EdgeType, KnowledgeEdge, KnowledgeNode, MapMode, NodeType } from './schema'

export interface GraphFilter { types: NodeType[]; categories: string[]; relations: EdgeType[] }
export interface GraphPath { nodeIds: string[]; steps: { edge: KnowledgeEdge; reversed: boolean }[] }
export type PathDirection = 'flow' | 'connections'
export const MAX_VISIBLE_NODES = 64

export function neighborhood(index: KnowledgeIndex, start: string, depth: number, includeContains = false) {
  const seen = new Set<string>(index.byId.has(start) ? [start] : [])
  let layer = [...seen]
  for (let i = 0; i < Math.min(depth, 2); i++) {
    const next: string[] = []
    for (const id of layer) for (const edge of index.adjacent.get(id) ?? []) {
      if (edge.type === 'contains' && !includeContains) continue
      const other = edge.source === id ? edge.target : edge.source
      if (!seen.has(other)) { seen.add(other); next.push(other) }
    }
    layer = next
  }
  return seen
}

/** A flow follows information: a consumer's `uses` edge is traversed backwards.
 * Categories and containment never create shortcuts between unrelated items. */
export function findPath(index: KnowledgeIndex, from: string, to: string, direction: PathDirection = 'flow'): GraphPath | null {
  if (!index.byId.has(from) || !index.byId.has(to)) return null
  if (from === to) return { nodeIds: [from], steps: [] }
  const visited = new Set([from])
  const queue = [from]
  const previous = new Map<string, { id: string; edge: KnowledgeEdge; reversed: boolean }>()
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!
    for (const edge of index.adjacent.get(current) ?? []) {
      if (edge.type === 'contains') continue
      let next: string | undefined
      let reversed = false
      if (direction === 'connections') {
        next = edge.source === current ? edge.target : edge.source
        reversed = edge.target === current
      } else if (edge.type === 'uses' || edge.type === 'performed_by' || edge.type === 'supports') {
        if (edge.target === current) { next = edge.source; reversed = true }
      } else if (edge.type !== 'related_to' && edge.source === current) next = edge.target
      if (!next || visited.has(next)) continue
      // Domain-level teaching edges cannot bypass actual process relations.
      if (index.byId.get(next)?.type === 'domain' && next !== to) continue
      if (index.byId.get(current)?.type === 'domain' && current !== from) continue
      visited.add(next)
      previous.set(next, { id: current, edge, reversed })
      if (next === to) {
        const nodeIds = [to], steps: GraphPath['steps'] = []
        let at = to
        while (at !== from) {
          const item = previous.get(at)!
          steps.unshift({ edge: item.edge, reversed: item.reversed })
          nodeIds.unshift(item.id)
          at = item.id
        }
        return { nodeIds, steps }
      }
      queue.push(next)
    }
  }
  return null
}

export function ancestors(index: KnowledgeIndex, id: string): string[] {
  const result: string[] = [], seen = new Set([id])
  let parent = index.byId.get(id)?.parentId
  while (parent && !seen.has(parent)) {
    seen.add(parent); result.unshift(parent); parent = index.byId.get(parent)?.parentId
  }
  return result
}

export function searchNodes(index: KnowledgeIndex, query: string): KnowledgeNode[] {
  const normalized = query.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
  if (!normalized) return []
  const words = normalized.split(/\s+/)
  return index.nodes.map(node => {
    const title = node.title.toLocaleLowerCase('ru').replaceAll('ё', 'е')
    const aliases = node.keywords.map(keyword => keyword.toLocaleLowerCase('ru').replaceAll('ё', 'е'))
    const haystack = [title, node.summary, ...node.keywords, node.explanation.what].join(' ').toLocaleLowerCase('ru').replaceAll('ё', 'е')
    const tokens = haystack.split(/[^\p{L}\p{N}]+/u)
    return { node, match: words.every(word => word.length <= 2 ? tokens.includes(word) : haystack.includes(word)), score: title === normalized ? 0 : aliases.includes(normalized) ? 1 : title.startsWith(normalized) ? 2 : title.includes(normalized) ? 3 : 4 }
  }).filter(item => item.match).sort((a, b) => a.score - b.score || a.node.title.localeCompare(b.node.title, 'ru')).slice(0, 12).map(item => item.node)
}

interface ProjectionOptions {
  mode: MapMode
  expanded: string[]
  selected: string | null
  focus: boolean
  depth: 1 | 2
  filter: GraphFilter
  journeyIds?: string[]
  path?: GraphPath | null
}
export function projectGraph(index: KnowledgeIndex, options: ProjectionOptions) {
  const { mode, expanded, selected, filter } = options
  const ids = new Set<string>()
  const override = !!options.path || !!options.journeyIds?.length || options.focus
  if (options.path) options.path.nodeIds.forEach(id => ids.add(id))
  else if (options.focus && selected) neighborhood(index, selected, options.depth, index.byId.get(selected)?.type === 'domain').forEach(id => ids.add(id))
  else if (options.journeyIds?.length) options.journeyIds.forEach(id => ids.add(id))
  else if (mode === 'processes') {
    const roots = expanded.filter(id => index.byId.get(id)?.type === 'domain')
    if (!roots.length) index.nodes.filter(n => n.type === 'domain').forEach(n => ids.add(n.id))
    const walk = (id: string, seen: Set<string>) => {
      if (seen.has(id)) return
      seen.add(id); ids.add(id)
      if (expanded.includes(id)) for (const child of index.children.get(id) ?? []) {
        const node = index.byId.get(child)
        if (node && node.type !== 'role' && (node.type !== 'module' || expanded.includes(node.id))) walk(child, seen)
      }
    }
    roots.forEach(root => walk(root, new Set()))
  } else {
    const target = mode === 'specialists' ? 'role' : mode === 'modules' ? 'module' : 'data'
    index.nodes.filter(n => n.type === target && (target !== 'data' || n.featured) && (target !== 'module' || index.byId.get(n.parentId ?? '')?.type !== 'module')).forEach(n => ids.add(n.id))
    if (mode === 'modules') {
      for (const id of expanded) if (index.byId.get(id)?.type === 'module') {
        ids.add(id)
        for (const child of index.children.get(id) ?? []) if (index.byId.get(child)?.type !== 'role') ids.add(child)
      }
      if (selected) ancestors(index, selected).filter(id => index.byId.get(id)?.type === 'module').forEach(id => ids.add(id))
    }
    if (mode === 'data') {
      const seeds = new Set(ids)
      for (const node of index.nodes) {
        if (!['data', 'process', 'activity'].includes(node.type) || seeds.has(node.id)) continue
        const connectedSeeds = new Set((index.adjacent.get(node.id) ?? [])
          .filter(e => ['uses', 'produces', 'transforms'].includes(e.type))
          .map(e => e.source === node.id ? e.target : e.source).filter(id => seeds.has(id)))
        if (connectedSeeds.size >= 2) ids.add(node.id)
      }
    }
    if (selected) neighborhood(index, selected, 1).forEach(id => {
      if (index.byId.get(id)?.type !== 'domain') ids.add(id)
    })
  }
  // A search or a related-item link can reveal an item from any of the four views.
  if (selected && !override) {
    ids.add(selected)
    if (index.byId.get(selected)?.type !== 'domain') {
      for (const id of neighborhood(index, selected, 1)) {
        const node = index.byId.get(id)
        if (node && node.type !== 'domain' && (mode !== 'processes' || (node.type !== 'role' && node.type !== 'module'))) ids.add(id)
      }
    }
  }
  if (!override && (filter.types.length || filter.categories.length)) {
    // A type filter can reveal those items even when the overview is collapsed.
    for (const node of index.nodes) {
      if (filter.types.length ? filter.types.includes(node.type) :
        mode === 'specialists' ? node.type === 'role' : mode === 'modules' ? node.type === 'module' :
        mode === 'data' ? node.type === 'data' : node.type !== 'role' && node.type !== 'module') ids.add(node.id)
    }
  }
  let candidates = index.nodes.filter(node => ids.has(node.id) && (override || (
    (!filter.types.length || filter.types.includes(node.type)) &&
    (!filter.categories.length || filter.categories.includes(node.categoryId))
  )))
  const count = candidates.length
  const important = options.path?.nodeIds ?? [selected, ...(options.journeyIds ?? [])].filter((x): x is string => !!x)
  candidates = candidates.sort((a, b) => (important.includes(a.id) ? -1 : 0) - (important.includes(b.id) ? -1 : 0))
  const visibleNodes = candidates.slice(0, MAX_VISIBLE_NODES)
  const visible = new Set(visibleNodes.map(n => n.id))
  const pathEdges = options.path ? new Set(options.path.steps.map(step => step.edge.id)) : null
  const visibleEdges = index.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target) &&
    (pathEdges ? pathEdges.has(edge.id) : override || !filter.relations.length || filter.relations.includes(edge.type)))
  return { nodes: visibleNodes, edges: visibleEdges, total: count, truncated: count > MAX_VISIBLE_NODES, override }
}
