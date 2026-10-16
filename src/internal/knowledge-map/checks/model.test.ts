import { describe, expect, it } from 'vitest'
import { knowledge, buildIndex } from '../entities/knowledge/model'
import { validateModel, type KnowledgeModel } from '../entities/knowledge/schema'
import { ancestors, findPath, neighborhood, projectGraph, searchNodes, MAX_VISIBLE_NODES } from '../entities/knowledge/graph'
import { defaultState } from '../features/explore/state'

const clone = (): KnowledgeModel => JSON.parse(JSON.stringify({ nodes: knowledge.nodes, edges: knowledge.edges, categories: knowledge.categories, learningPaths: knowledge.learningPaths, sources: knowledge.sources })) as KnowledgeModel
describe('Целостная учебная модель', () => {
  it('contains substantial explanations and coverage across all categories and roles', () => {
    expect(knowledge.nodes.length).toBeGreaterThan(110)
    expect(knowledge.edges.length).toBeGreaterThan(300)
    expect(knowledge.learningPaths.length).toBeGreaterThanOrEqual(6)
    for (const category of knowledge.categories) expect(knowledge.nodes.filter(n => n.categoryId === category.id).length).toBeGreaterThanOrEqual(7)
    for (const node of knowledge.nodes) {
      expect(node.explanation.what.length).toBeGreaterThan(30)
      expect(node.explanation.example.length).toBeGreaterThan(40)
      expect(knowledge.adjacent.get(node.id)?.some(e => e.type !== 'contains')).toBe(true)
    }
  })
  it('rejects duplicate IDs and nonexistent endpoints', () => {
    const duplicate = clone(); duplicate.nodes.push(duplicate.nodes[0]!)
    expect(() => validateModel(duplicate)).toThrow(/повтор ID/)
    const dangling = clone(); dangling.edges[0]!.target = 'unknown-node'
    expect(() => validateModel(dangling)).toThrow(/неизвестный конец/)
  })
  it('rejects invalid types, broken learning steps and recursive containment', () => {
    const invalid = clone(); Object.assign(invalid.nodes[0]!, { type: 'screen' })
    expect(() => validateModel(invalid)).toThrow()
    const path = clone(); path.learningPaths[0]!.steps[0]!.nodeId = 'does-not-exist'
    expect(() => validateModel(path)).toThrow(/неизвестный шаг/)
    const cycle = clone(); cycle.nodes[0]!.parentId = cycle.nodes[0]!.id
    expect(() => validateModel(cycle)).toThrow(/цикл вложенности/)
  })
  it('rejects incorrect specialist/module targets and inconsistent contains edges', () => {
    const bad = clone(); bad.edges.push({ id: 'e-invalid-role', source: 'logging', target: 'core', type: 'performed_by', label: 'Неверная роль', description: 'Физический керн не может быть исполнителем работ.', relationScope: 'domain', evidence: [] })
    expect(() => validateModel(bad)).toThrow(/исполнитель/)
    const contains = clone(); contains.edges.find(e => e.type === 'contains')!.source = 'enterprise'
    expect(() => validateModel(contains)).toThrow(/вложенность расходится/)
  })
  it('distinguishes planned and retained modules from existing capabilities', () => {
    expect(knowledge.byId.get('module-technology')?.knowledgeBasis).toBe('requirement')
    expect(knowledge.byId.get('module-geology')?.scope).toBe('domain')
    expect(knowledge.byId.get('module-geology')?.delivery).toBeUndefined()
    expect(knowledge.byId.get('module-bgd')?.parentId).toBe('module-geology')
    expect(knowledge.byId.get('site')?.explanation.example).toContain('независимо')
    expect(knowledge.byId.get('cutoff-limits')?.explanation.what).toContain('формулы')
  })
})
describe('Paths, cycles and progressive graph views', () => {
  it('finds a meaningful logging-to-composite path including the data transformation', () => {
    const path = findPath(knowledge, 'logging', 'composite-data')!
    expect(path.nodeIds[0]).toBe('logging')
    expect(path.nodeIds).toContain('log-curves')
    expect(path.nodeIds.at(-1)).toBe('composite-data')
    expect(path.steps.every(s => s.edge.type !== 'contains')).toBe(true)
    expect(path.steps.some(s => s.reversed && s.edge.type === 'uses')).toBe(true)
  })
  it('never invents a path through membership in a common category', () => {
    expect(findPath(knowledge, 'logging', 'ai-suggestion')).toBeNull()
    expect(findPath(knowledge, 'no-such-id', 'logging')).toBeNull()
    expect(findPath(knowledge, 'logging', 'logging')?.nodeIds).toEqual(['logging'])
  })
  it('respects direction and offers bidirectional conceptual exploration separately', () => {
    expect(findPath(knowledge, 'manager', 'driller')).toBeNull()
    const connections = findPath(knowledge, 'manager', 'driller', 'connections')
    expect(connections).not.toBeNull()
    expect(connections?.steps.every(step => step.edge.description.length > 10)).toBe(true)
  })
  it('handles real feedback loops without repeating nodes', () => {
    const path = findPath(knowledge, 'circulation', 'processing')!
    expect(path.nodeIds).toContain('injection-solution')
    expect(new Set(path.nodeIds).size).toBe(path.nodeIds.length)
    const nearby = neighborhood(knowledge, 'injection', 2)
    expect(nearby.has('injection')).toBe(true)
    expect(nearby.size).toBeLessThan(knowledge.nodes.length)
  })
  it('starts with ten domains and expands nested processes without duplicates', () => {
    const state = defaultState()
    const overview = projectGraph(knowledge, state)
    expect(overview.nodes).toHaveLength(10)
    expect(overview.nodes.every(n => n.type === 'domain')).toBe(true)
    const expanded = projectGraph(knowledge, { ...state, expanded: ['research', 'logging'] })
    expect(expanded.nodes.some(n => n.id === 'gamma')).toBe(true)
    expect(new Set(expanded.nodes.map(n => n.id)).size).toBe(expanded.nodes.length)
  })
  it('projects all four modes from identical node objects', () => {
    const types = { processes: 'domain', specialists: 'role', data: 'data', modules: 'module' } as const
    for (const mode of Object.keys(types) as (keyof typeof types)[]) {
      const result = projectGraph(knowledge, { ...defaultState(), mode })
      expect(result.nodes.length).toBeGreaterThan(4)
      expect(result.nodes.every(n => mode === 'data' ? ['data', 'process', 'activity'].includes(n.type) : n.type === types[mode])).toBe(true)
      expect(result.nodes.every(n => n === knowledge.byId.get(n.id))).toBe(true)
    }
  })
  it('focuses on one or two steps and caps rendering of large projections', () => {
    const one = projectGraph(knowledge, { ...defaultState(), selected: 'logging', focus: true, depth: 1 })
    const two = projectGraph(knowledge, { ...defaultState(), selected: 'logging', focus: true, depth: 2 })
    expect(one.nodes.length).toBeLessThanOrEqual(two.nodes.length)
    expect(two.nodes.length).toBeLessThanOrEqual(MAX_VISIBLE_NODES)
    expect(two.nodes.some(n => n.id === 'logging')).toBe(true)
  })
  it('filters global types/categories and can produce a deliberate empty state', () => {
    const result = projectGraph(knowledge, { ...defaultState(), filter: { types: ['data'], categories: ['research'], relations: ['produces'] } })
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.nodes.every(n => n.type === 'data' && n.categoryId === 'research')).toBe(true)
    expect(result.edges.every(e => e.type === 'produces')).toBe(true)
    const empty = projectGraph(knowledge, { ...defaultState(), filter: { types: ['role'], categories: ['accounting'], relations: [] } })
    expect(empty.nodes).toHaveLength(0)
  })
  it('keeps path edges exact even when filters would hide them', () => {
    const path = findPath(knowledge, 'logging', 'composite-data')!
    const result = projectGraph(knowledge, { ...defaultState(), path, filter: { types: ['module'], categories: [], relations: ['contains'] } })
    expect(result.nodes.map(n => n.id).sort()).toEqual([...path.nodeIds].sort())
    expect(result.edges.map(e => e.id).sort()).toEqual(path.steps.map(s => s.edge.id).sort())
  })
  it('has bounded ancestors and Cyrillic multiword and alias search', () => {
    expect(ancestors(knowledge, 'gamma')).toEqual(['research', 'logging'])
    expect(searchNodes(knowledge, 'КС')[0]?.id).toBe('resistivity')
    expect(searchNodes(knowledge, 'подсчетный блок')[0]?.id).toBe('reserve-block')
    expect(searchNodes(knowledge, 'проба раствора')[0]?.id).toBe('solution-sample')
    expect(searchNodes(knowledge, 'nothing here')).toHaveLength(0)
  })
  it('scales to an extended local JSON model without renderer changes', () => {
    const model = clone()
    const newNode = { ...model.nodes.find(n => n.id === 'core')!, id: 'additional-sample', title: 'Дополнительный образец' }
    model.nodes.push(newNode)
    model.edges.push({ id: 'e-research-contains-extra', source: 'research', target: newNode.id, type: 'contains', label: 'Учебное расширение', description: 'Новый образец добавлен в область исследований через данные.', relationScope: 'domain', evidence: [] })
    expect(buildIndex(validateModel(model)).byId.has('additional-sample')).toBe(true)
  })
})
