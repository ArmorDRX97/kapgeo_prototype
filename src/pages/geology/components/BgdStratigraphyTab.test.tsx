import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BgdStratigraphyTab } from './BgdStratigraphyTab'

afterEach(()=>{cleanup();localStorage.clear()})
describe('стратиграфия скважины',()=>{
  it('выбирает строку, сохраняет правки и восстанавливает их после открытия',()=>{
    const props={wellId:'example',depth:100,canEdit:true}
    const view=render(<BgdStratigraphyTab {...props} />)
    const table=screen.getByRole('table'), rows=within(table).getAllByRole('row')
    fireEvent.click(within(rows[2]!).getByText('Продуктивный горизонт'))
    fireEvent.change(screen.getByLabelText('Возраст'),{target:{value:'Новый возраст'}})
    fireEvent.change(screen.getByLabelText('Наименование'),{target:{value:'Новое подразделение'}})
    fireEvent.click(screen.getByRole('button',{name:'Сохранить стратиграфию'}))
    view.unmount();render(<BgdStratigraphyTab {...props} />)
    expect(screen.getByText('Новое подразделение')).toBeInTheDocument()
    expect(screen.getByText('Новый возраст')).toBeInTheDocument()
  })
  it('не сохраняет перекрывающиеся интервалы',()=>{
    render(<BgdStratigraphyTab wellId="example" depth={100} canEdit />)
    fireEvent.change(screen.getByLabelText('Подошва, м'),{target:{value:'90'}})
    expect(screen.getByRole('alert')).toHaveTextContent('перекрываются')
    expect(screen.getByRole('button',{name:'Сохранить стратиграфию'})).toBeDisabled()
  })
})
