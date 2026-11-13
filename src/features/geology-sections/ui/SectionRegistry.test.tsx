import { useState, type AnchorHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { validateSectionSearch, type SectionSearch } from '../model/search'
import { SectionRegistry } from './SectionRegistry'
import { sectionRegistryEntries } from '../model/registryEntries'

vi.mock('@tanstack/react-router', () => ({ Link: ({ children, params, search, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { params?: { sectionId: string }; search?: SectionSearch; to: string; activeOptions?: { exact?: boolean } }) => {
  delete props.activeOptions
  const query = new URLSearchParams(Object.entries(search ?? {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))
  return <a href={`${to.replace('$sectionId', params?.sectionId ?? '')}${query.size ? `?${query}` : ''}`} {...props}>{children}</a>
} }))
afterEach(cleanup)
const list = () => within(screen.getByRole('navigation', { name: 'Список разрезов' }))
function Harness() {
  const [search, setSearch] = useState<SectionSearch>({})
  const documents = initialSections()
  const sections = sectionRegistryEntries(documents).filter(entry => !entry.demo).map((entry, index) => ({ ...entry, techBlock: `ТБ-0${index + 1}` }))
  return <SectionRegistry sections={sections} sectionId="GTR-01" search={search} onSearch={patch => setSearch({ ...search, ...patch })} collapsed={false} onToggle={vi.fn()} />
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
    expect(registry.getByText('ТБ-01')).toBeTruthy()
    expect(registry.queryByText('ТБ-02')).toBeNull()
    expect(registry.getAllByRole('link', { hidden: true, name: /Северный · профиль/ })).toHaveLength(1)
    fireEvent.change(stage,{target:{value:'operationalExploration'}})
    expect(registry.getByText('ТБ-02')).toBeTruthy()
    expect(registry.queryByText('ТБ-01')).toBeNull()
    expect(registry.queryByRole('link', { name: /Северный · профиль 01/ })).not.toBeInTheDocument()
  })
  it('collapses a registry group while preserving its count and chosen grouping',()=>{
    render(<Harness />)
    const summary=screen.getByText('ТБ-01'),group=summary.closest('details')!
    expect(group.open).toBe(true)
    expect(within(group).getByText('1')).toBeTruthy()
    expect(list().getByRole('link', { name: /Северный · профиль 01/ })).toBeInTheDocument()
    expect(group.querySelector('.section-registry-group__items a[aria-current="page"]')).toBeTruthy()
    fireEvent.click(summary)
    expect(group.open).toBe(false)
    expect(list().queryAllByRole('link')).toHaveLength(0)
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
    expect(screen.getByText('ТБ-01')).toBeInTheDocument()
    expect(screen.getByText('ТБ-02')).toBeInTheDocument()
  })
  it('filters by block and sorts by title in ascending order', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры разрезов' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Сортировать по' }), { target: { value: 'title' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Направление сортировки' }), { target: { value: 'asc' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Геологический блок' }), { target: { value: 'Без геологического блока' } })
    expect(list().getByText('ТБ-01')).toBeInTheDocument()
    expect(list().getByText('ТБ-02')).toBeInTheDocument()
    expect(list().getByRole('link', { name: /Северный · профиль 01/ })).toBeInTheDocument()
  })
  it('resets block filters from an empty result', () => {
    const [first, second] = initialSections()
    const metadata = { depositBody: '', createdOn: '2026-01-01', compiledBy: '', checkedBy: '' }
    first!.metadata = { ...metadata, ...first!.metadata, geoBlock: 'ГБ-01' }
    second!.metadata = { ...metadata, ...second!.metadata, techBlock: 'ТБ-02' }
    function EmptyBlockHarness() {
      const [search, setSearch] = useState<SectionSearch>({ geoBlock: 'ГБ-01', techBlock: 'ТБ-02' })
      return <SectionRegistry sections={sectionRegistryEntries([first!, second!]).filter(entry => !entry.demo)} search={search} onSearch={patch => setSearch({ ...search, ...patch })} collapsed={false} onToggle={vi.fn()} />
    }
    render(<EmptyBlockHarness />)
    expect(screen.getByText('Разрезы не найдены')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтры' }))
    expect(screen.queryByText('Разрезы не найдены')).toBeNull()
    expect(list().getAllByRole('link', { hidden: true })).toHaveLength(2)
  })
  it('expands a selected example inside its block and links its well to the same example on the map', () => {
    const sections = sectionRegistryEntries(initialSections())
    const sectionId = 'GTR-SAMPLE-03-02'
    const props = { sections, sectionId, onSearch: vi.fn(), collapsed: false, onToggle: vi.fn() }
    const { rerender } = render(<SectionRegistry {...props} search={{ view: 'lithology' }} />)
    const block = screen.getByText('ТБ-03').closest('details')!
    const wells = within(block).getByRole('list', { name: 'Скважины: Разрез 02' })
    const well = within(wells).getByRole('link', { name: 'ГС-101' })
    expect(block.open).toBe(true)
    const url = new URL(well.getAttribute('href')!, 'https://example.test')
    expect(url.pathname).toBe(`/geology/sections/${sectionId}`)
    const search = validateSectionSearch(Object.fromEntries(url.searchParams))
    expect(search).toMatchObject({ view: 'map', mapWell: 'GTR-W1' })
    rerender(<SectionRegistry {...props} search={search} />)
    expect(well).toHaveAttribute('aria-current', 'page')
    expect(within(block).getByRole('link', { name: /Разрез 02/ })).not.toHaveAttribute('aria-current')
  })
})
