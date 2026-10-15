import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { knowledge } from '../entities/knowledge/model'
import { validateModel } from '../entities/knowledge/schema'
import { findPath, projectGraph } from '../entities/knowledge/graph'
import { defaultState } from '../features/explore/state'
import { DetailPanel } from '../widgets/explanations/DetailPanel'
import { viewportIntersectsBounds } from '../shared/viewport'

const copy = () => structuredClone({ nodes: knowledge.nodes, edges: knowledge.edges, categories: knowledge.categories, learningPaths: knowledge.learningPaths, sources: knowledge.sources })

describe('Reviewed KAPGEO context', () => {
  it('rejects a saved camera outside the updated graph while preserving a useful camera', () => {
    const bounds = { x: 0, y: 0, width: 1140, height: 556 }
    expect(viewportIntersectsBounds({ x: -10000, y: -10000, zoom: 1 }, bounds, 1200, 600)).toBe(false)
    expect(viewportIntersectsBounds({ x: 30, y: 10, zoom: 0.8 }, bounds, 1200, 600)).toBe(true)
  })
  it('distinguishes working geology, deferred KND, excluded rhythm packs and menu-only entries', () => {
    expect(knowledge.byId.get('module-geology')?.scope).toBe('implemented')
    for (const id of ['module-core-menu', 'module-gis-tablet', 'module-well-passport', 'module-reserves', 'module-tech-flow']) expect(knowledge.byId.get(id)?.delivery?.status).toBe('placeholder')
    expect(knowledge.byId.get('alpha-knd')?.delivery?.status).toBe('deferred')
    expect(knowledge.byId.get('rhythm-excluded')?.delivery?.status).toBe('excluded')
    expect(knowledge.byId.get('section-projection')?.delivery?.note).toContain('ещё не внедрена')
    expect(knowledge.nodes.some(node => node.explanation.what.includes('вход временно скрыт'))).toBe(false)
    expect(knowledge.edges.some(edge => edge.description.includes('вход временно скрыт'))).toBe(false)
  })
  it('validates evidence IDs and rejects working links to a placeholder', () => {
    const missing = copy()
    missing.nodes[0]!.evidence = [{ sourceId: 'missing-source', locator: 'Проверка происхождения' }]
    expect(() => validateModel(missing)).toThrow(/неизвестный источник/)
    const falseImplementation = copy()
    falseImplementation.edges.push({ id: 'bad-live-link', source: 'module-plan', target: 'module-reserves', type: 'related_to', label: 'Неверная связь', description: 'Нельзя объявить отсутствующий расчёт работающим.', relationScope: 'prototype', evidence: [] })
    expect(() => validateModel(falseImplementation)).toThrow(/недоступной возможности/)
    const duplicate = copy()
    duplicate.sources.push(duplicate.sources[0]!)
    expect(() => validateModel(duplicate)).toThrow(/повтор ID/)
  })
  it('reveals seven Alpha methods and keeps a readable module overview with expandable submodules', () => {
    const expanded = projectGraph(knowledge, { ...defaultState(), selected: 'module-alpha', expanded: ['interpretation', 'module-geology', 'module-alpha'] })
    for (const id of ['alpha-gamma', 'alpha-knd', 'alpha-electro', 'alpha-current', 'alpha-thermal', 'alpha-caliper', 'alpha-flow']) expect(expanded.nodes.some(node => node.id === id)).toBe(true)
    const modules = projectGraph(knowledge, { ...defaultState(), mode: 'modules' })
    expect(modules.truncated).toBe(false)
    expect(modules.nodes).toHaveLength(6)
    const geology = projectGraph(knowledge, { ...defaultState(), mode: 'modules', selected: 'module-geology', expanded: ['interpretation', 'module-geology'] })
    for (const id of ['module-alpha', 'module-sections', 'module-plan', 'module-core-menu', 'module-gis-tablet', 'module-well-passport', 'module-reserves']) expect(geology.nodes.some(node => node.id === id)).toBe(true)
  })
  it('follows records and dependencies in their actual flow direction', () => {
    const sourcePath = findPath(knowledge, 'alpha-source-record', 'alpha-gamma')
    expect(sourcePath?.nodeIds).toEqual(['alpha-source-record', 'alpha-gamma'])
    expect(findPath(knowledge, 'alpha-filter', 'alpha-flow')?.nodeIds).toEqual(['alpha-filter', 'alpha-flow'])
    expect(knowledge.adjacent.get('alpha-knd')?.some(edge => edge.type === 'produces')).toBe(false)
    expect(knowledge.byId.get('autonomous-documents')?.explanation.what).toContain('не создаёт общей идентичности')
  })
  it('shows status, source and the remaining audit issue instead of declaring it fixed', () => {
    const onOpen = vi.fn()
    render(<DetailPanel node={knowledge.byId.get('section-projection')!} index={knowledge} pinned={false} focused={false} onClose={vi.fn()} onOpen={onOpen} onPin={vi.fn()} onFocus={vi.fn()} onPath={vi.fn()} onShare={vi.fn()} />)
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByRole('heading', { name: /Реализовано частично/ })).toBeVisible()
    expect(within(panel).getByRole('heading', { name: 'Основания и источники' })).toBeVisible()
    expect(within(panel).getByText('Дизайн.pdf: аудит 14 замечаний')).toBeVisible()
    fireEvent.click(within(panel).getByRole('button', { name: /Вариант чертежа разреза/ }))
    expect(onOpen).toHaveBeenCalledWith('section-print')
  })
})
