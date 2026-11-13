import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { validateSection } from '../../../repository/demo/sectionRepository'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { toFieldPoint } from '../model/sectionPlan'
import { SectionConstruction } from './SectionConstruction'

vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('./SectionConstructionMap', () => ({
  SectionConstructionMap: ({ onPoint }: { onPoint: (point: XY) => void }) => <>
    <button onClick={() => onPoint(toFieldPoint({ x: 30, y: 40 }))}>Начало трассы на карте</button>
    <button onClick={() => onPoint(toFieldPoint({ x: 170, y: 65 }))}>Поворот трассы на карте</button>
    <button onClick={() => onPoint(toFieldPoint({ x: 310, y: 92 }))}>Конец трассы на карте</button>
  </>,
}))
afterEach(cleanup)

it('uses the drawn trace and the reviewed wells to create a valid section', () => {
  const save = vi.fn<(draft: GeologySection) => void>()
  render(<SectionConstruction onCancel={vi.fn()} onSave={save} />)
  const next = screen.getByRole('button', { name: 'К подбору скважин' })
  expect(next).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Начало трассы на карте' }))
  expect(next).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Поворот трассы на карте' }))
  fireEvent.click(screen.getByRole('button', { name: 'Конец трассы на карте' }))
  fireEvent.click(next)

  expect(screen.getByRole('checkbox', { name: 'Включить ГС-101' })).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Включить ГС-102' }))
  fireEvent.click(screen.getByRole('button', { name: 'Посмотреть разрез' }))
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'К скважинам' }))
  expect(screen.getByRole('checkbox', { name: 'Включить ГС-102' })).not.toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Посмотреть разрез' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Название разреза' }), { target: { value: 'Профиль по двум сегментам' } })
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить разрез' }))

  const doc = validateSection(save.mock.calls[0]?.[0])
  expect(doc.profile).toHaveLength(3)
  expect(doc.wellIds).not.toContain('GTR-W2')
  const segments = sectionSegments(doc)
  expect(segments[0]?.wellIds).toContain('GTR-W1')
  expect(segments[1]?.wellIds).toContain('GTR-W5')
  expect(doc.top).toBeGreaterThan(105)
  expect(doc.bottom).toBeLessThan(-40)
})
