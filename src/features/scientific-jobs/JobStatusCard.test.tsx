import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { applyScientificJobCommand, createScientificJob } from '../../shared/scientific/jobs'
import { JobStatusCard } from './JobStatusCard'

const actor = { id: 'PERSON-TEST', name: 'Тестовый геолог · synthetic' }

describe('JobStatusCard', () => {
  it('shows a stage without a fabricated percent for stage-only work', () => {
    const queued = createScientificJob({
      type: 'interpretation', label: 'AI-интерпретация', progressMode: 'stage_only',
      inputSnapshotId: 'SNAP-1', component: { id: 'ai-interpretation', version: '0.8.0' }, createdBy: actor,
    }, 'JOB-UI-1', '2026-08-21T08:00:00.000Z')
    const running = applyScientificJobCommand(queued, { type: 'start', stage: 'Подготовка признаков' }, '2026-08-21T08:01:00.000Z')

    render(<JobStatusCard job={running} />)

    expect(screen.getByText('Прогресс по этапам')).toBeInTheDocument()
    expect(screen.getByLabelText('Точный процент недоступен')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('exposes determinate progress and active controls', () => {
    const onPoll = vi.fn()
    const onCancel = vi.fn()
    const queued = createScientificJob({
      type: 'file_import', label: 'Импорт LAS', progressMode: 'determinate', total: 200, unit: 'строк',
      inputSnapshotId: 'SNAP-2', component: { id: 'las-parser', version: '2.4.1' }, createdBy: actor,
    }, 'JOB-UI-2', '2026-08-21T08:00:00.000Z')
    const running = applyScientificJobCommand(queued, { type: 'start', stage: 'Чтение' }, '2026-08-21T08:01:00.000Z')
    const progressed = applyScientificJobCommand(running, { type: 'report_progress', stage: 'Нормализация', completed: 110 }, '2026-08-21T08:02:00.000Z')

    render(<JobStatusCard job={progressed} onPoll={onPoll} onCancel={onCancel} />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '55')
    fireEvent.click(screen.getByRole('button', { name: 'Обновить статус' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }))
    expect(onPoll).toHaveBeenCalledWith('JOB-UI-2')
    expect(onCancel).toHaveBeenCalledWith('JOB-UI-2')
  })
})
