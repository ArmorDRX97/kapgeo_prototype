import { beforeEach, describe, expect, it } from 'vitest'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { createAlphaDocument } from '../../../entities/interpretation/model/alphaDocument'
import { alphaExport, resultCsv } from './export'
import { defaultAlphaView, displayedTracks, loadAlphaViews, saveAlphaViews } from './viewPreferences'
import { alphaTracks } from './tracks'
import { alphaStale } from '../../../entities/interpretation/lib/alphaCalculations'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PassportTracks } from './PassportTracks'
import { styledTracks } from './viewPreferences'

const well = interpretationWells[0]!
describe('Alpha presentation and reproducible exports', () => {
  beforeEach(() => localStorage.clear())
  it('exports original measurements as well as parameters and results', () => {
    const doc = createAlphaDocument(well), exported = alphaExport(well, doc)
    expect(exported.synthetic).toBe(true); expect(exported.records).toHaveLength(13)
    expect(exported.records[0]!.depths.length).toBeGreaterThan(1000)
    expect(exported.document.gamma.rows).toEqual(doc.gamma.rows)
    expect(resultCsv(well, doc, 'controls', 'result')).toContain('mainMetro')
  })
  it('quotes arbitrary labels and avoids executable spreadsheet cells', () => {
    const doc = createAlphaDocument(well); doc.projects[0]!.label = '=1+1;"пример"'
    const csv = resultCsv(well, doc, 'thermal', 'projects')
    expect(csv.startsWith('\ufeff')).toBe(true); expect(csv).toContain('"\'=1+1;""пример"""')
  })
  it('persists views per well and method without changing the calculation document', () => {
    const doc = createAlphaDocument(well), original = JSON.stringify(doc), view = defaultAlphaView(), tracks = alphaTracks(well, doc, 'electro', 'result')
    view.widths['alpha-rs'] = 340; view.hidden = ['alpha-gr']; view.order = ['kf', 'electro']; view.grid = false
    view.scales['alpha-rs'] = { min: 1, max: 100, log: true }
    saveAlphaViews(well.id, { electro: view })
    expect(loadAlphaViews(well.id).electro).toEqual(view); expect(loadAlphaViews('other-well')).toEqual({})
    const shown = displayedTracks(tracks, view, alphaExport(well, doc).records)
    expect(shown[0]!.id).toBe('kf'); expect(shown.some(t => t.id === 'alpha-gr')).toBe(false)
    expect(shown.find(t => t.id === 'alpha-rs')).toMatchObject({ width: 340, grid: false, curves: [{ scale: { min: 1, max: 100, log: true } }, expect.anything()] })
    expect(JSON.stringify(doc)).toBe(original)
  })
  it('falls back from malformed presentation preferences', () => {
    localStorage.setItem(`kapgeo.alpha.tablet.v1:${well.id}`, '{bad')
    expect(loadAlphaViews(well.id)).toEqual({})
    const view = defaultAlphaView(); view.scales['alpha-gr'] = { min: 0, max: 0 }
    saveAlphaViews(well.id, { gamma: view }); expect(loadAlphaViews(well.id)).toEqual({})
  })
  it('migrates metadata and keeps header edits independent from calculations', () => {
    const doc = createAlphaDocument(well), old = JSON.parse(JSON.stringify(doc)); delete old.header
    expect(validateAlpha(well, old).header.deposit).toBe('demo-north')
    doc.header.horizon = 'Условный горизонт 2'; doc.header.deposit = 'demo-east'
    expect(alphaStale(well, doc, 'gamma')).toBe(false)
    doc.header.loggedAt = 'bad-date'; expect(() => validateAlpha(well, doc)).toThrow('заполнение')
  })
  it('persists custom appearance and annotations and carries them into vector output', () => {
    const doc = createAlphaDocument(well), tracks = alphaTracks(well, doc, 'flow', 'result'), view = defaultAlphaView()
    view.styles['alpha-flow'] = { color: '#123456', lineWidth: 2, dashed: true, markers: true, fill: { from: 118, to: 135, baseline: 300, color: '#123456' } }
    view.notes = [{ id: 'note-1', trackId: 'alpha-flow', depth: 120, text: 'Контрольная подпись' }]
    saveAlphaViews(well.id, { flow: view }); expect(loadAlphaViews(well.id).flow).toEqual(view)
    const shown = styledTracks(tracks, view), svg = renderToStaticMarkup(createElement('svg', {}, createElement(PassportTracks, { tracks: shown, from: 112, to: 140, scale: 200 })))
    expect(svg).toContain('#123456'); expect(svg).toContain('stroke-dasharray'); expect(svg).toContain('<circle'); expect(svg).toContain('Контрольная')
    const exported = alphaExport(well, doc); expect(exported.presentation.flow!.notes[0]!.text).toBe('Контрольная подпись')
  })
  it('shows project-bounded deficit intervals for expanded caliper and actual points on flow', () => {
    const doc = createAlphaDocument(well), caliper = alphaTracks(well, doc, 'caliper', 'result'), deficit = caliper.find(t => t.id === 'caliper-deficit')!
    expect(deficit.editable).toBe(false); expect(deficit.intervals!.length).toBeGreaterThan(0)
    expect(deficit.intervals!.every(r => r.from >= doc.parameters.caliper.projectFrom && r.to <= doc.parameters.caliper.projectTo)).toBe(true)
    expect(alphaTracks(well, doc, 'flow', 'result').find(t => t.id === 'alpha-flow')!.curves[0]!.markers).toBe(true)
  })
})
