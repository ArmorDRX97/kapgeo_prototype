import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import { createAlphaDocument } from '../../../entities/interpretation/model/alphaDocument'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { CurveEditorWorkbench } from './CurveEditorWorkbench'

afterEach(cleanup)
const well = interpretationWells.find(w => w.id === 'int-demo-01')!
describe('visible point editing workspace', () => {
  it('retains the entry depth and selected point when creating a derivative', () => {
    const pending = vi.fn()
    function Example() {
      const [doc, setDoc] = useState(() => createAlphaDocument(well)), [recordId, setRecord] = useState('alpha-gr')
      return <CurveEditorWorkbench doc={doc} records={allAlphaRecords(well, doc)} recordId={recordId} well={well} from={118} disabled={false} tools onChange={setDoc} onRecord={setRecord} onPending={pending} />
    }
    render(<Example />)
    expect(screen.getByRole('spinbutton', { name: 'Глубина точки, м' })).toHaveValue(118)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Значение точки, мкР/ч' }), { target: { value: '123' } })
    expect(screen.getByRole('button', { name: 'Создать производную запись' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Запись ГИС' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Применить точку' }))
    expect(screen.getByRole('combobox', { name: 'Запись ГИС' })).toHaveValue('point-alpha-gr')
    expect(screen.getByRole('spinbutton', { name: 'Глубина точки, м' })).toHaveValue(118)
    expect(screen.getByRole('spinbutton', { name: 'Значение точки, мкР/ч' })).toHaveValue(123)
    expect(pending).toHaveBeenLastCalledWith(false)
  })
})
