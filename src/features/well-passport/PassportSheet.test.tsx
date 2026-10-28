import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { defaultSettings, passportPages, passportWells } from './model'
import { PassportSheet, SHEET_HEIGHT, SHEET_WIDTH } from './PassportSheet'

describe('утверждённый паспорт рудных интервалов',()=>{
  it('отображает вертикальный лист и предусмотренные образцом колонки',()=>{
    const well=passportWells[0]!, settings=defaultSettings(well)
    const {container}=render(<PassportSheet well={well} settings={settings} range={passportPages(settings)[0]!} pageNumber={1} pageCount={1} />)
    const sheet=screen.getByRole('group',{name:/Паспорт ГС-101/})
    expect(sheet).toHaveAttribute('viewBox',`0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}`)
    for(const label of ['ПАСПОРТ РУДНЫХ ИНТЕРВАЛОВ','Диаграммы гамма-каротажа','Диаграммы ЭК и ИК','Диаграммы КМ','Диаграммы ТМ, КОосв.','Литология','Стратиграфия']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(container.querySelector('path[stroke="#c62e31"]')).toBeInTheDocument()
    expect(container.querySelector('path[stroke="#2c987c"]')).toBeInTheDocument()
  })
})
