import { describe, expect, it } from 'vitest'
import { DemoScientificJobRepository } from './scientificJobRepository'

const input = {
  type: 'file_import' as const,
  label: 'Импорт LAS · TEST-01',
  progressMode: 'determinate' as const,
  total: 10,
  unit: 'строк',
  inputSnapshotId: 'FILE-TEST-01',
  component: { id: 'las-parser', version: '2.4.1' },
  createdBy: { id: 'PERSON-TEST', name: 'Тестовый геолог · synthetic' },
}

describe('DemoScientificJobRepository', () => {
  it('creates an idempotent deterministic job and advances it only through polling', async () => {
    const repository = new DemoScientificJobRepository()
    const created = await repository.create(input, 'idem-test-01')
    const repeated = await repository.create(input, 'idem-test-01')

    expect(repeated.id).toBe(created.id)
    expect(created).toMatchObject({ state: 'queued', progress: { completed: 0, total: 10, unit: 'строк' } })

    const running = await repository.poll(created.id)
    const working = await repository.poll(created.id)
    const validated = await repository.poll(created.id)
    const post = await repository.poll(created.id)
    const succeeded = await repository.poll(created.id)

    expect([running.state, working.state, validated.state, post.state, succeeded.state])
      .toEqual(['running', 'running', 'running', 'post_processing', 'succeeded'])
    expect(working.progress?.completed).toBe(6)
    expect(validated.diagnostics).toContainEqual(expect.objectContaining({ code: 'DEPTH_GAP', severity: 'warning' }))
    expect(succeeded.resultRefs).toContainEqual(expect.objectContaining({ type: 'log_run' }))
  })

  it('supports cancellation and creates a linked retry attempt', async () => {
    const repository = new DemoScientificJobRepository()
    const created = await repository.create(input, 'idem-test-02')
    const cancelled = await repository.cancel(created.id, 'Проверка отмены')
    const retried = await repository.retry(cancelled.id)

    expect(cancelled.history.at(-1)).toMatchObject({ state: 'cancelled', message: 'Проверка отмены' })
    expect(retried).toMatchObject({ state: 'queued', attempt: 2, parentJobId: created.id, inputSnapshotId: created.inputSnapshotId })
    expect(retried.id).not.toBe(created.id)
  })
})
