import { describe, expect, it } from 'vitest'
import type { Well } from '../../entities/well/model/types'
import { createEmptyWellBgdForm, validateWellBgdForm } from '../../features/geobase/model/wellBgdForm'

describe('UC.KAPGEO.BGD.03 well form validation', () => {
  it('accepts a minimal well and enforces uniqueness inside one deposit', () => {
    const form = createEmptyWellBgdForm('DEP-SARYTAU')
    form.bgd!.name = 2099
    form.code = '2099'

    expect(validateWellBgdForm(form, [])).toEqual([])

    const existing = {
      id: 'WELL-2099', code: '2099', type: 'Разведочная', status: 'На проверке', quality: 'Высокое', purpose: 'Разведочная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, site: 'Северный', block: '—', cell: '—', depth: 0, coordinates: { x: 0, y: 0 }, mapPosition: { x: 1, y: 1 }, updatedAt: 'Сегодня', completeness: 10, aiConflicts: 0, bgd: { ...structuredClone(form.bgd!), depositId: 'DEP-SARYTAU' },
    } satisfies Well

    expect(validateWellBgdForm(form, [existing])).toContain('Скважина с таким названием уже существует в выбранном месторождении.')
    existing.bgd!.depositId = 'DEP-SEVERNOE'
    expect(validateWellBgdForm(form, [existing])).toEqual([])
  })

  it('rejects incomplete drilling and impermeable intervals', () => {
    const form = createEmptyWellBgdForm('DEP-SARYTAU')
    form.bgd!.name = 2100
    form.bgd!.drilling.intervals.push({ id: 'DRILL-1', drillingDiameter: 132, depthFrom: 100, depthTo: 50, drillingTool: '', flushingAgent: '' })
    form.bgd!.geology.impermeableIntervals.push({ id: 'IMP-1', depthFrom: 80, depthTo: 80 })

    const errors = validateWellBgdForm(form, [])
    expect(errors).toContain('Проверьте обязательные значения интервала бурения №1.')
    expect(errors).toContain('Проверьте непроницаемый интервал №1.')
  })
})
