import { describe, expect, it } from 'vitest'
import { columnTracks, trackIssues, visibleTracks } from './columnTracks'
import { sectionWellSources } from '../model/fixtures'
const column = { width: 12, offset: 0, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 80 }
const well = sectionWellSources[0]!
describe('configurable local column tracks', () => {
  it('reads legacy order without overwriting settings, keeps an explicit empty list', () => {
    expect(columnTracks(column, well).map(t => t.type)).toEqual(['lithology', 'curve', 'curve', 'intervals'])
    expect(columnTracks({ ...column, curvesFirst: true }, well)[0]?.curveId).toBe('rs')
    expect(visibleTracks({ ...column, tracks: [] }, well)).toEqual([])
  })
  it('preserves arbitrary order/width and filters hidden tracks without changing composition', () => {
    const tracks = [{ id: 'gr', type: 'curve' as const, curveId: 'gr', width: 45 }, { id: 'l', type: 'lithology' as const, width: 18 }]
    expect(visibleTracks({ ...column, tracks }, well)).toEqual(tracks)
    expect(visibleTracks({ ...column, tracks, curveSettings: { gr: { visible: false, min: 0, max: 100, from: 0, to: 145 } } }, well)).toEqual([tracks[1]])
    expect(trackIssues({ ...column, tracks }, well)).toEqual([])
  })
  it('rejects missing local sources, duplicate IDs and invalid widths', () => {
    expect(trackIssues({ ...column, tracks: [{ id: 'a', type: 'curve', curveId: 'absent', width: 100 }, { id: 'a', type: 'lithology', width: 12 }] }, well)).toHaveLength(3)
  })
})
