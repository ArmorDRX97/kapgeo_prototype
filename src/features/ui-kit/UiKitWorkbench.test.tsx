import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UiKitWorkbench } from './UiKitWorkbench'
import { Dialogs } from './Dialogs'
import { Tables } from './Tables'
import { Layouts } from './Layouts'
import { validateKitSearch, type KitSection } from './model'

afterEach(cleanup)
describe('UI Kit navigation and state examples',()=>{
  it('normalizes direct URLs and does not accept unknown categories',()=>{
    expect(validateKitSearch({section:'tables'})).toEqual({section:'tables'})
    expect(validateKitSearch({section:'unknown'})).toEqual({section:undefined})
    expect(validateKitSearch({section:'overview'})).toEqual({section:undefined})
  })
  it('navigates the catalogue, filters categories and resets only its own examples',()=>{
    function Harness(){const [section,setSection]=useState<KitSection>('overview');return <UiKitWorkbench section={section} onSection={setSection} onBack={()=>{}}/>}
    const before=localStorage.getItem('kapgeo.passport.design.v2.PS-101')
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText('Поиск категории UI Kit'),{target:{value:'checkbox'}})
    const nav=screen.getByRole('navigation',{name:'Категории UI Kit'})
    expect(within(nav).queryByRole('button',{name:'Таблицы'})).not.toBeInTheDocument()
    fireEvent.click(within(nav).getByRole('button',{name:'Поля и переключатели'}))
    fireEvent.change(screen.getByLabelText('Обычное поле'),{target:{value:'Изменено'}})
    fireEvent.click(screen.getByRole('button',{name:'Сбросить примеры'}))
    fireEvent.click(screen.getByRole('button',{name:'Сбросить'}))
    expect(screen.getByLabelText('Обычное поле')).toHaveValue('СК-001')
    expect(localStorage.getItem('kapgeo.passport.design.v2.PS-101')).toBe(before)
  })
  it('keeps edited dialog values when Escape is cancelled',async()=>{
    const notify=vi.fn();render(<Dialogs notify={notify}/>)
    fireEvent.click(screen.getByRole('button',{name:/Рабочая форма/}))
    fireEvent.change(screen.getByLabelText('Название скважины *'),{target:{value:'СК-777'}})
    fireEvent.keyDown(screen.getByLabelText('Название скважины *'),{key:'Escape'})
    expect(screen.getByRole('dialog',{name:'Есть несохранённые изменения'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Продолжить редактирование'}))
    expect(screen.getByLabelText('Название скважины *')).toHaveValue('СК-777')
    fireEvent.click(screen.getByRole('button',{name:'Сохранить'}))
    await waitFor(()=>expect(notify).toHaveBeenCalledWith('Сохранено название: СК-777'))
  })
  it('selects an entire registry row and supports paging and empty search',()=>{
    render(<Tables notify={()=>{}}/>)
    const registry=screen.getByRole('region',{name:'Скважины · реестр'})
    const second=within(registry).getByText('СК-002').closest('tr')!
    fireEvent.click(second.children[2]!)
    expect(screen.getByRole('status')).toHaveTextContent('Выбрана СК-002')
    fireEvent.click(screen.getByRole('button',{name:'Следующая страница'}))
    expect(within(registry).getByText('СК-007')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Поиск в реестре'),{target:{value:'нет-такой-скважины'}})
    expect(within(registry).getByText(/Ничего не найдено/)).toBeInTheDocument()
  })
  it('asks before deleting an editable table row and validates depth ranges',()=>{
    render(<Tables notify={()=>{}}/>)
    fireEvent.change(screen.getByLabelText('До, строка 1'),{target:{value:'-1'}})
    expect(screen.getByRole('alert')).toHaveTextContent('конец — больше начала')
    fireEvent.click(screen.getByRole('button',{name:'Удалить строку 1'}))
    expect(screen.getByLabelText('До, строка 1')).toHaveValue(-1)
    fireEvent.click(screen.getByRole('button',{name:'Удалить'}))
    expect(screen.getByLabelText('До, строка 1')).toHaveValue(240)
  })
  it('locks the BGD composition, protects changed selects and retains saved values',()=>{
    render(<Layouts notify={()=>{}}/>)
    expect(screen.getByLabelText('Название скважины')).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Изменить'}))
    fireEvent.change(screen.getByLabelText('Участок'),{target:{value:'Участок Б'}})
    fireEvent.click(screen.getByRole('button',{name:'Координаты и глубина'}))
    expect(screen.getByRole('dialog',{name:'Есть несохранённые изменения'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Остаться'}))
    fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}))
    expect(screen.getByLabelText('Участок')).toHaveValue('Участок Б')
    expect(screen.getByLabelText('Участок')).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'СК-002'}))
    fireEvent.click(screen.getByRole('button',{name:'СК-001'}))
    expect(screen.getByLabelText('Участок')).toHaveValue('Участок Б')
    fireEvent.click(screen.getByRole('button',{name:'Координаты и глубина'}))
    fireEvent.click(screen.getByRole('button',{name:'Изменить'}))
    fireEvent.change(screen.getByLabelText('X устья, м'),{target:{value:'58099'}})
    fireEvent.click(screen.getByRole('button',{name:'Описание'}))
    expect(screen.getByRole('dialog',{name:'Есть несохранённые изменения'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Сохранить и перейти'}))
    fireEvent.click(screen.getByRole('button',{name:'Координаты и глубина'}))
    expect(screen.getByLabelText('X устья, м')).toHaveValue(58099)
  })
})
