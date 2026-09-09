import { describe, expect, it } from 'vitest'
import type { CoreRun, CoreSample } from '../model/types'
import { validateCoreRun, validateCoreSample } from './validation'

const run: CoreRun = { id: 'R1', number: '1', depthFrom: 10, depthTo: 14, recoveredLength: 3, measurements: [] }

describe('well core validation', () => {
  it('rejects overlapping runs and impossible recovery', () => {
    const candidate = { ...run, id: 'R2', number: '2', depthFrom: 13, recoveredLength: 5 }
    expect(validateCoreRun(candidate, [run], 100)).toEqual(expect.arrayContaining([
      expect.stringContaining('пересекается'),
      expect.stringContaining('Выход керна'),
    ]))
  })

  it('keeps zero as a valid result and validates sample links', () => {
    const sample: CoreSample = {
      id: 'S1', number: 'K-1', sampleType: 'Керновая', samplingDate: '', performer: '', laboratory: '', comment: '',
      intervals: [{ id: 'I1', runId: run.id, drillDepthFrom: 11, drillDepthTo: 12, adjustedDepthFrom: null, adjustedDepthTo: null }],
      results: [{ id: 'V1', analyte: 'U', value: 0, qualifier: '', unit: 'мг/кг' }],
    }
    expect(validateCoreSample(sample, [], [run])).toEqual([])
    expect(validateCoreSample({ ...sample, id: 'S2' }, [sample], [run])).toContain('Проба «K-1» этого вида уже существует.')
  })
})
