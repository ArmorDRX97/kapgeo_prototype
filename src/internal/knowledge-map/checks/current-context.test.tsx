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
  it('uses source facts independently of frontend readiness', () => {
    expect(knowledge.nodes.every(node => node.scope === 'domain' && !node.delivery && node.evidence.length > 0)).toBe(true)
    expect(knowledge.edges.every(edge => edge.relationScope === 'domain' && edge.evidence.length > 0)).toBe(true)
    expect(knowledge.byId.get('rhythm-excluded')?.title).toBe('Ритмопачки и принятые интервалы')
    expect(knowledge.byId.get('alpha-knd')?.explanation.what).toContain('Метод КНДм')
    expect(knowledge.nodes.filter(node => /^flow-f\d\d$/.test(node.id))).toHaveLength(18)
    expect(knowledge.sources.filter(source => /^[dv]\d{3}$/.test(source.id))).toHaveLength(122)
    expect(new Set(knowledge.nodes.flatMap(node => node.evidence.map(ref => ref.sourceId))).size).toBe(122)
    expect(knowledge.sources.every(source => source.kind !== 'implementation' && !/geo-module-refs|archive\/|docs\/|knowledge\/prototype\//.test(source.reference))).toBe(true)
    expect(JSON.stringify([knowledge.nodes, knowledge.edges, knowledge.learningPaths])).not.toMatch(/DR-\d|VA-\d|Дизайн\.pdf|в (текущем )?прототипе/i)
  })
  it('validates evidence IDs and rejects working links to a placeholder', () => {
    const missing = copy()
    missing.nodes[0]!.evidence = [{ sourceId: 'missing-source', locator: 'Проверка происхождения' }]
    expect(() => validateModel(missing)).toThrow(/неизвестный источник/)
    const falseImplementation = copy()
    falseImplementation.nodes.find(node => node.id === 'module-reserves')!.delivery = { status: 'placeholder', note: 'Синтетический пример недоступной возможности.' }
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
    expect(modules.nodes).toHaveLength(5)
    const geology = projectGraph(knowledge, { ...defaultState(), mode: 'modules', selected: 'module-geology', expanded: ['interpretation', 'module-geology'] })
    for (const id of ['module-alpha', 'module-sections', 'module-plan', 'module-core-menu', 'module-gis-tablet', 'module-well-passport', 'module-reserves']) expect(geology.nodes.some(node => node.id === id)).toBe(true)
  })
  it('follows records and dependencies in their actual flow direction', () => {
    const sourcePath = findPath(knowledge, 'alpha-source-record', 'alpha-gamma')
    expect(sourcePath?.nodeIds).toEqual(['alpha-source-record', 'alpha-gamma'])
    expect(findPath(knowledge, 'alpha-filter', 'alpha-flow')?.nodeIds).toEqual(['alpha-filter', 'alpha-flow'])
    expect(knowledge.adjacent.get('alpha-knd')?.some(edge => edge.type === 'produces' && edge.target === 'alpha-result')).toBe(true)
    expect(knowledge.byId.get('autonomous-documents')?.explanation.what).toContain('не создаёт общей идентичности')
  })
  it('shows source evidence without a frontend delivery claim', () => {
    const onOpen = vi.fn()
    render(<DetailPanel node={knowledge.byId.get('section-projection')!} index={knowledge} pinned={false} focused={false} onClose={vi.fn()} onOpen={onOpen} onPin={vi.fn()} onFocus={vi.fn()} onPath={vi.fn()} onShare={vi.fn()} />)
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByText('Старая система · материалы и демонстрации')).toBeVisible()
    expect(within(panel).queryByText(/Статус в KAPGEO/)).not.toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Основания и источники' })).toBeVisible()
    expect(within(panel).getAllByText(/D017 · GeoSection.pdf/).length).toBeGreaterThan(0)
    fireEvent.click(within(panel).getByRole('button', { name: /Чертёж разреза/ }))
    expect(onOpen).toHaveBeenCalledWith('section-print')
  })
})
