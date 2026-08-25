import { afterEach, describe, expect, it } from 'vitest'
import { DemoWellPassportRepository } from './wellPassportRepository'

describe('DemoWellPassportRepository', () => {
  const repository = new DemoWellPassportRepository()

  afterEach(() => repository.reset())

  it('previews exact downstream impact before save', async () => {
    const workspace = await repository.getWorkspace('WELL-1010-FULL')
    const impact = await repository.previewImpact(
      'WELL-1010-FULL',
      {
        ...workspace.passport.data,
        location: {
          ...workspace.passport.data.location,
          coordinates: [workspace.passport.data.location.coordinates[0] + 1, workspace.passport.data.location.coordinates[1]],
        },
      },
      workspace.construction.data,
    )

    expect(impact.map((item) => item.dependency.downstreamType)).toEqual(['section', 'model'])
    expect(impact.every((item) => item.changedFields.includes('coordinates'))).toBe(true)
  })

  it('rejects an invalid CRS-aware wellhead geometry at the repository boundary', async () => {
    const workspace = await repository.getWorkspace('WELL-1010-FULL')

    await expect(repository.save({
      wellId: 'WELL-1010-FULL',
      passport: {
        ...workspace.passport.data,
        location: { ...workspace.passport.data.location, coordinates: [Number.NaN, 4_812_856.4] },
      },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'SAVE-INVALID-GEOMETRY',
      reason: 'Проверка невалидной геометрии',
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', details: { geometryIssues: expect.any(Array) } })
  })

  it('creates new versions and stale records without mutating the published baseline', async () => {
    const workspace = await repository.getWorkspace('WELL-1010-FULL')
    const originalDepth = workspace.passport.data.depth
    const result = await repository.save({
      wellId: 'WELL-1010-FULL',
      passport: { ...workspace.passport.data, depth: originalDepth + 1 },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'SAVE-DEPTH-001',
      reason: 'Уточнение глубины по акту сверки',
    })

    expect(result.workspace.passport.version).toBe(13)
    expect(result.workspace.passport.status).toBe('in_review')
    expect(result.workspace.staleness).toHaveLength(3)

    const history = await repository.getHistory('WELL-1010-FULL')
    expect(history.passport).toHaveLength(2)
    expect(history.passport[0]).toMatchObject({ version: 12, status: 'published' })
    expect(history.passport[0]?.data.depth).toBe(originalDepth)
    expect(history.passport[1]?.basedOnVersionId).toBe(history.passport[0]?.id)
  })

  it('returns a comparable conflict instead of overwriting a newer version', async () => {
    const workspace = await repository.getWorkspace('WELL-1010-FULL')
    const command = {
      wellId: 'WELL-1010-FULL',
      passport: { ...workspace.passport.data, purpose: 'Наблюдательная' as const },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'SAVE-PURPOSE-001',
    }
    await repository.save(command)

    await expect(repository.save({ ...command, idempotencyKey: 'SAVE-PURPOSE-STALE', passport: { ...command.passport, profile: 'PR-09' } }))
      .rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
        details: expect.objectContaining({ expectedPassportVersion: 12, currentPassportVersion: 13 }),
      })
  })

  it('reuses the first result for the same idempotency key', async () => {
    const workspace = await repository.getWorkspace('WELL-1010-FULL')
    const command = {
      wellId: 'WELL-1010-FULL',
      passport: { ...workspace.passport.data, purpose: 'Наблюдательная' as const },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'SAVE-IDEMPOTENT-001',
    }

    const first = await repository.save(command)
    const repeated = await repository.save(command)
    const history = await repository.getHistory('WELL-1010-FULL')

    expect(repeated.requestId).toBe(first.requestId)
    expect(history.passport).toHaveLength(2)
  })
})
