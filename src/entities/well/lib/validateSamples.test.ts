import { describe, expect, it } from 'vitest'
import type { Sample } from '../model/types'
import { validateSamples } from './validateSamples'

const sample: Sample = { id: 'S-1', number: 'SM-001', wellId: 'WELL-1', from: 120, to: 122, type: 'Керновая', status: 'Черновик', purpose: 'Химический анализ', createdAt: 'Сегодня' }

describe('validateSamples', () => {
  it('reports duplicate numbers and invalid depth ranges', () => {
    const issues = validateSamples([sample, { ...sample, id: 'S-2', from: 122, to: 120 }], 200)
    expect(issues).toHaveLength(2)
    expect(issues.map((item) => item.message).join(' ')).toMatch(/уже используется/)
  })
})
