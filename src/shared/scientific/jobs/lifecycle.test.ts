import { describe, expect, it } from 'vitest'
import { applyScientificJobCommand, canRetryScientificJob, createScientificJob, retryScientificJob, scientificJobPercent } from './lifecycle'
import { ScientificJobError, type CreateScientificJobInput } from './types'

const actor = { id: 'PERSON-TEST', name: 'Тестовый геолог · synthetic' }
const base: CreateScientificJobInput = {
  type: 'file_import',
  label: 'Импорт LAS',
  progressMode: 'determinate',
  total: 100,
  unit: 'строк',
  inputSnapshotId: 'FILE-SNAPSHOT-1',
  component: { id: 'las-parser', version: '2.4.1' },
  createdBy: actor,
}

describe('scientific job lifecycle', () => {
  it('runs through explicit queued, running, post-processing and succeeded states', () => {
    const queued = createScientificJob(base, 'JOB-1', '2026-08-21T08:00:00.000Z')
    const running = applyScientificJobCommand(queued, { type: 'start', stage: 'Чтение файла' }, '2026-08-21T08:01:00.000Z')
    const progressed = applyScientificJobCommand(running, { type: 'report_progress', stage: 'Нормализация', completed: 55 }, '2026-08-21T08:02:00.000Z')
    const post = applyScientificJobCommand(progressed, { type: 'begin_post_processing', stage: 'Создание версии' }, '2026-08-21T08:03:00.000Z')
    const done = applyScientificJobCommand(post, { type: 'succeed', stage: 'Выполнено', resultRefs: [{ id: 'LOG-1', type: 'log_run', label: 'Набор ГИС' }] }, '2026-08-21T08:04:00.000Z')

    expect([queued.state, running.state, progressed.state, post.state, done.state]).toEqual(['queued', 'running', 'running', 'post_processing', 'succeeded'])
    expect(scientificJobPercent(progressed)).toBe(55)
    expect(done.progress?.completed).toBe(100)
    expect(done.resultRefs).toHaveLength(1)
    expect(done.history.map((item) => item.state)).toEqual(['queued', 'running', 'running', 'post_processing', 'succeeded'])
    expect(() => applyScientificJobCommand(done, { type: 'cancel' }, '2026-08-21T08:05:00.000Z')).toThrowError(ScientificJobError)
  })

  it('never fabricates a percentage for stage-only jobs', () => {
    const stageOnly = createScientificJob({ ...base, progressMode: 'stage_only', total: undefined, unit: undefined }, 'JOB-2', '2026-08-21T08:00:00.000Z')
    const running = applyScientificJobCommand(stageOnly, { type: 'start', stage: 'Подготовка признаков' }, '2026-08-21T08:01:00.000Z')

    expect(scientificJobPercent(running)).toBeUndefined()
    expect(() => applyScientificJobCommand(running, { type: 'report_progress', stage: 'Интерпретация', completed: 25 }, '2026-08-21T08:02:00.000Z'))
      .toThrowError(expect.objectContaining({ code: 'INVALID_PROGRESS' }))
    expect(() => createScientificJob({ ...base, progressMode: 'stage_only' }, 'JOB-3', '2026-08-21T08:00:00.000Z'))
      .toThrowError(expect.objectContaining({ code: 'INVALID_DEFINITION' }))
  })

  it('enforces monotonic progress and preserves provenance on retry', () => {
    const queued = createScientificJob(base, 'JOB-4', '2026-08-21T08:00:00.000Z')
    const running = applyScientificJobCommand(queued, { type: 'start', stage: 'Чтение' }, '2026-08-21T08:01:00.000Z')
    const progressed = applyScientificJobCommand(running, { type: 'report_progress', stage: 'Чтение', completed: 60 }, '2026-08-21T08:02:00.000Z')

    expect(() => applyScientificJobCommand(progressed, { type: 'report_progress', stage: 'Чтение', completed: 59 }, '2026-08-21T08:03:00.000Z'))
      .toThrowError(expect.objectContaining({ code: 'INVALID_PROGRESS' }))

    const failed = applyScientificJobCommand(progressed, {
      type: 'fail',
      stage: 'Ошибка mapping',
      problem: { code: 'MAPPING_REQUIRED', title: 'Нужно сопоставление', detail: 'Выберите depth channel.', retriable: true },
    }, '2026-08-21T08:04:00.000Z')
    const retried = retryScientificJob(failed, 'JOB-5', '2026-08-21T08:05:00.000Z')

    expect(canRetryScientificJob(failed)).toBe(true)
    expect(retried).toMatchObject({ state: 'queued', attempt: 2, parentJobId: 'JOB-4', inputSnapshotId: 'FILE-SNAPSHOT-1' })
    expect(retried.progress?.completed).toBe(0)
  })
})
