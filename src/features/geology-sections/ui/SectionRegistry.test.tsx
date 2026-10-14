import { useState, type AnchorHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  it('filters and groups by six study stages independently of section type',()=>{
    render(<Harness />)
    fireEvent.click(screen.getByRole('button',{name:'Фильтры разрезов'}))
    const stage=screen.getByRole('combobox',{name:'Этап изучения'})
    expect(stage.querySelectorAll('option')).toHaveLength(7)
    fireEvent.change(stage,{target:{value:'detailed'}})
    expect(screen.getByText('Разрезы не найдены')).toBeTruthy()
    fireEvent.change(stage,{target:{value:'exploration'}})
    fireEvent.change(screen.getByRole('combobox',{name:'Группировать'}),{target:{value:'stage'}})
    expect(screen.getByText('Разведочные работы · 200')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(200)
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
    expect(screen.getAllByRole('link')).toHaveLength(200)
  })
})
