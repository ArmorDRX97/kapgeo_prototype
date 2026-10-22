import { useState, type AnchorHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import type { SectionSearch } from '../model/search'
import { SectionRegistry } from './SectionRegistry'
import { sectionRegistryEntries } from '../model/registryEntries'

vi.mock('@tanstack/react-router', () => ({ Link: ({ children, params: _params, search: _search, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { params?: unknown; search?: unknown; to: string }) => { void _params; void _search; return <a href={to} {...props}>{children}</a> } }))
afterEach(cleanup)
function Harness() {
  const [search, setSearch] = useState<SectionSearch>({})
  return <SectionRegistry sections={sectionRegistryEntries(initialSections())} sectionId="GTR-01" search={search} onSearch={patch => setSearch({ ...search, ...patch })} collapsed={false} onToggle={vi.fn()} />
}
describe('compact section registry', () => {
  it('filters the two demo branches by study stage independently of section type',()=>{
    render(<Harness />)
    fireEvent.click(screen.getByRole('button',{name:'Фильтры разрезов'}))
    const stage=screen.getByRole('combobox',{name:'Этап изучения'})
    const registry=within(screen.getByRole('navigation',{name:'Список разрезов'}))
    expect(stage.querySelectorAll('option')).toHaveLength(7)
    fireEvent.change(stage,{target:{value:'detailed'}})
    expect(screen.queryByText('Разрезы не найдены')).toBeNull()
    expect(registry.getByText('Детальная разведка')).toBeTruthy()
    expect(registry.queryByText('Эксплуатационная разведка')).toBeNull()
    expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(1)
    fireEvent.change(stage,{target:{value:'operationalExploration'}})
    expect(registry.getByText('Эксплуатационная разведка')).toBeTruthy()
    expect(registry.queryByText('Детальная разведка')).toBeNull()
    expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(1)
  })
  it('collapses a registry group while preserving its count and chosen grouping',()=>{
    render(<Harness />)
    const summary=screen.getByText('Детальная разведка'),group=summary.closest('details')!
    expect(group.open).toBe(true)
    expect(within(group).getByText('1')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(group.querySelector('.section-registry-group__items a[aria-current="page"]')).toBeTruthy()
    fireEvent.click(summary)
    expect(group.open).toBe(false)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    fireEvent.click(summary)
    expect(group.open).toBe(true)
  })
  it('opens filters on demand and combines them with quick search, then resets an empty result', () => {
    render(<Harness />)
    expect(screen.queryByRole('combobox', { name: 'Тип' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры разрезов' }))
    expect(screen.getByRole('dialog', { name: 'Фильтры разрезов' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Тип' }), { target: { value: 'main' } })
    expect(screen.getByRole('button', { name: 'Фильтры разрезов: 1' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Фильтры разрезов: 1' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск разреза' }), { target: { value: 'missing' } })
    expect(screen.getByText('Разрезы не найдены')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтры' }))
    expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(2)
  })
  it('filters by block and sorts by title in ascending order', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры разрезов' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Сортировать по' }), { target: { value: 'title' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Направление сортировки' }), { target: { value: 'asc' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Геологический блок' }), { target: { value: 'Без геологического блока' } })
    const links = screen.getAllByRole('link', { hidden: true })
    expect(links.length).toBe(2)
    expect(links[0]?.textContent).toContain('Северный · профиль')
  })
  it('resets block filters from an empty result', () => {
    const [first, second] = initialSections()
    const metadata = { depositBody: '', createdOn: '2026-01-01', compiledBy: '', checkedBy: '' }
    first!.metadata = { ...metadata, ...first!.metadata, geoBlock: 'ГБ-01' }
    second!.metadata = { ...metadata, ...second!.metadata, techBlock: 'ТБ-02' }
    function EmptyBlockHarness() {
      const [search, setSearch] = useState<SectionSearch>({ geoBlock: 'ГБ-01', techBlock: 'ТБ-02' })
      return <SectionRegistry sections={sectionRegistryEntries([first!, second!])} search={search} onSearch={patch => setSearch({ ...search, ...patch })} collapsed={false} onToggle={vi.fn()} />
    }
    render(<EmptyBlockHarness />)
    expect(screen.getByText('Разрезы не найдены')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтры' }))
    expect(screen.queryByText('Разрезы не найдены')).toBeNull()
    expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(2)
  })
})
