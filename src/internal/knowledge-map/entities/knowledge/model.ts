import nodes from '../../data/nodes.json'
import edges from '../../data/edges.json'
import categories from '../../data/categories.json'
import learningPaths from '../../data/learning-paths.json'
import sources from '../../data/sources.json'
import { validateModel, type KnowledgeModel, type KnowledgeEdge } from './schema'

export function buildIndex(model: KnowledgeModel) {
  const byId = new Map(model.nodes.map(n => [n.id, n]))
  const byCategory = new Map(model.categories.map(c => [c.id, c]))
  const adjacent = new Map<string, KnowledgeEdge[]>()
  const children = new Map<string, string[]>()
  for (const node of model.nodes) {
    adjacent.set(node.id, [])
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id])
  }
  for (const edge of model.edges) {
    adjacent.get(edge.source)?.push(edge)
    adjacent.get(edge.target)?.push(edge)
  }
  const bySourceId = new Map(model.sources.map(source => [source.id, source]))
  return { ...model, byId, byCategory, adjacent, children, bySourceId }
}
export type KnowledgeIndex = ReturnType<typeof buildIndex>
export const knowledge = buildIndex(validateModel({ nodes, edges, categories, learningPaths, sources }))
