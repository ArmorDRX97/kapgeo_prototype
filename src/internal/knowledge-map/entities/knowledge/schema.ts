import { z } from 'zod'

export const NODE_TYPES = ['domain', 'process', 'activity', 'entity', 'data', 'role', 'module', 'concept'] as const
export const EDGE_TYPES = ['contains', 'precedes', 'produces', 'uses', 'transforms', 'performed_by', 'supports', 'related_to'] as const
export const MODES = ['processes', 'specialists', 'data', 'modules'] as const
const id = z.string().regex(/^[a-z][a-z0-9-]*$/)
const text = z.string().trim().min(3)
const evidence = z.array(z.object({ sourceId: id, locator: text })).default([])
export const sourceSchema = z.object({ id, title: text, kind: z.enum(['manual', 'video-audit', 'review', 'implementation', 'decision']), reference: text, asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

export const nodeSchema = z.object({
  id,
  type: z.enum(NODE_TYPES),
  categoryId: id,
  parentId: id.optional(),
  title: text,
  summary: text,
  keywords: z.array(z.string().trim().min(1)).default([]),
  featured: z.boolean().default(false),
  overviewPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  scope: z.enum(['domain', 'implemented', 'retained', 'planned']).default('domain'),
  knowledgeBasis: z.enum(['source', 'legacy', 'requirement', 'open', 'context']).default('context'),
  delivery: z.object({ status: z.enum(['prototype', 'partial', 'placeholder', 'deferred', 'excluded']), note: text }).optional(),
  evidence,
  explanation: z.object({
    what: text,
    why: text,
    how: z.array(text).min(1),
    participants: z.array(text).min(1),
    inputs: z.array(text).min(1),
    outputs: z.array(text).min(1),
    next: text,
    example: text,
  }),
})
export const edgeSchema = z.object({
  id,
  source: id,
  target: id,
  type: z.enum(EDGE_TYPES),
  label: text,
  description: text,
  relationScope: z.enum(['domain', 'prototype', 'proposal']).default('domain'),
  evidence,
})
export const categorySchema = z.object({
  id,
  domainId: id,
  title: text,
  shortTitle: text,
  description: text,
  tone: z.enum(['earth', 'blue', 'violet', 'teal', 'amber', 'cyan', 'rose', 'slate', 'green', 'indigo']),
  order: z.number().int().nonnegative(),
})
export const pathSchema = z.object({
  id,
  title: text,
  description: text,
  duration: text,
  steps: z.array(z.object({ nodeId: id, title: text, explanation: text })).min(3),
})
export const modelSchema = z.object({
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
  categories: z.array(categorySchema).min(1),
  learningPaths: z.array(pathSchema).min(1),
  sources: z.array(sourceSchema).default([]),
})
export type KnowledgeNode = z.infer<typeof nodeSchema>
export type KnowledgeEdge = z.infer<typeof edgeSchema>
export type Category = z.infer<typeof categorySchema>
export type LearningPath = z.infer<typeof pathSchema>
export type KnowledgeModel = z.infer<typeof modelSchema>
export type NodeType = typeof NODE_TYPES[number]
export type EdgeType = typeof EDGE_TYPES[number]
export type MapMode = typeof MODES[number]

/** Reject ambiguous identities and broken links before they reach the renderer. */
export function validateModel(input: unknown): KnowledgeModel {
  const model = modelSchema.parse(input)
  const errors: string[] = []
  const unique = (items: { id: string }[], label: string) => {
    const seen = new Set<string>()
    for (const item of items) {
      if (seen.has(item.id)) errors.push(`${label}: повтор ID ${item.id}`)
      seen.add(item.id)
    }
    return seen
  }
  const nodeIds = unique(model.nodes, 'Узлы')
  const categoryIds = unique(model.categories, 'Области')
  unique(model.edges, 'Связи')
  unique(model.learningPaths, 'Маршруты')
  const sourceIds = unique(model.sources, 'Источники')
  for (const item of [...model.nodes, ...model.edges]) {
    for (const ref of item.evidence) if (!sourceIds.has(ref.sourceId)) errors.push(`${item.id}: неизвестный источник ${ref.sourceId}`)
  }
  const byId = new Map(model.nodes.map(n => [n.id, n]))
  const triples = new Set<string>()
  for (const node of model.nodes) {
    if (!categoryIds.has(node.categoryId)) errors.push(`${node.id}: неизвестная область`)
    if (node.parentId && !nodeIds.has(node.parentId)) errors.push(`${node.id}: неизвестный родитель`)
    const ancestors = new Set([node.id])
    let parent = node.parentId
    while (parent) {
      if (ancestors.has(parent)) { errors.push(`${node.id}: цикл вложенности`); break }
      ancestors.add(parent)
      parent = byId.get(parent)?.parentId
    }
  }
  for (const category of model.categories) {
    const domain = byId.get(category.domainId)
    if (domain?.type !== 'domain' || domain.categoryId !== category.id) errors.push(`${category.id}: неверный корневой узел`)
  }
  for (const edge of model.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) errors.push(`${edge.id}: неизвестный конец связи`)
    if (edge.source === edge.target) errors.push(`${edge.id}: связь с самим собой`)
    const triple = `${edge.source}|${edge.type}|${edge.target}`
    if (triples.has(triple)) errors.push(`${edge.id}: повтор связи`)
    triples.add(triple)
    if (edge.type === 'contains' && byId.get(edge.target)?.parentId !== edge.source) errors.push(`${edge.id}: вложенность расходится с parentId`)
    if (edge.type === 'performed_by' && byId.get(edge.target)?.type !== 'role') errors.push(`${edge.id}: исполнитель должен быть специалистом`)
    if (edge.type === 'supports' && byId.get(edge.target)?.type !== 'module') errors.push(`${edge.id}: поддерживающий узел должен быть модулем`)
    if (edge.relationScope === 'prototype' && [edge.source, edge.target].some(endpoint => ['placeholder', 'deferred', 'excluded'].includes(byId.get(endpoint)?.delivery?.status ?? ''))) errors.push(`${edge.id}: рабочая связь ведёт к недоступной возможности`)
  }
  for (const node of model.nodes) {
    if (node.parentId && !model.edges.some(e => e.type === 'contains' && e.source === node.parentId && e.target === node.id)) errors.push(`${node.id}: отсутствует contains`)
  }
  for (const path of model.learningPaths) {
    for (const step of path.steps) if (!nodeIds.has(step.nodeId)) errors.push(`${path.id}: неизвестный шаг ${step.nodeId}`)
    if (new Set(path.steps.map(s => s.nodeId)).size !== path.steps.length) errors.push(`${path.id}: повтор шага`)
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return model
}
