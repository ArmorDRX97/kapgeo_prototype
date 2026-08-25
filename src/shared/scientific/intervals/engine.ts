import { IntervalCommandError, type IntervalCommand, type IntervalDiff, type IntervalEditorState, type IntervalIssue, type IntervalPolicy, type IntervalRecord } from './types'

const epsilon = 0.000_001

function cloneIntervals<T extends IntervalRecord>(intervals: T[]): T[] {
  return structuredClone(intervals)
}

function sortedIntervals<T extends IntervalRecord>(intervals: T[]): T[] {
  return [...intervals].sort((left, right) => left.from - right.from || left.to - right.to || left.id.localeCompare(right.id))
}

function snap(value: number, resolution: number): number {
  if (!Number.isFinite(value) || resolution <= 0) return value
  const decimals = Math.max(0, Math.ceil(-Math.log10(resolution)))
  return Number((Math.round(value / resolution) * resolution).toFixed(decimals))
}

function assertUniqueId<T extends IntervalRecord>(intervals: T[], id: string, ignoredIds: string[] = []): void {
  if (intervals.some((item) => item.id === id && !ignoredIds.includes(item.id))) {
    throw new IntervalCommandError('DUPLICATE_ID', `Интервал ${id} уже существует.`)
  }
}

function findInterval<T extends IntervalRecord>(intervals: T[], id: string): T {
  const interval = intervals.find((item) => item.id === id)
  if (!interval) throw new IntervalCommandError('NOT_FOUND', `Интервал ${id} не найден.`)
  return interval
}

export function executeIntervalCommand<T extends IntervalRecord>(intervals: T[], command: IntervalCommand<T>, policy: IntervalPolicy<T>): T[] {
  const current = cloneIntervals(intervals)
  let result: T[]

  switch (command.type) {
    case 'add': {
      assertUniqueId(current, command.interval.id)
      result = [...current, { ...structuredClone(command.interval), from: snap(command.interval.from, policy.snapResolution), to: snap(command.interval.to, policy.snapResolution) }]
      break
    }
    case 'update': {
      findInterval(current, command.id)
      result = current.map((item) => {
        if (item.id !== command.id) return item
        const updated = { ...item, ...structuredClone(command.patch) }
        return {
          ...updated,
          from: command.patch.from === undefined ? updated.from : snap(updated.from, policy.snapResolution),
          to: command.patch.to === undefined ? updated.to : snap(updated.to, policy.snapResolution),
        }
      })
      break
    }
    case 'split': {
      const source = findInterval(current, command.id)
      const at = snap(command.at, policy.snapResolution)
      if (at <= source.from + epsilon || at >= source.to - epsilon) {
        throw new IntervalCommandError('INVALID_SPLIT', `Граница ${at} должна находиться внутри интервала ${source.from}–${source.to}.`)
      }
      if (command.newIds[0] === command.newIds[1]) throw new IntervalCommandError('DUPLICATE_ID', 'Новые части интервала должны иметь разные идентификаторы.')
      assertUniqueId(current, command.newIds[0], [source.id])
      assertUniqueId(current, command.newIds[1], [source.id])
      result = current.flatMap((item) => item.id === source.id
        ? [{ ...item, id: command.newIds[0], to: at }, { ...item, id: command.newIds[1], from: at }]
        : [item])
      break
    }
    case 'merge': {
      const first = findInterval(current, command.firstId)
      const second = findInterval(current, command.secondId)
      const ordered = first.from <= second.from ? [first, second] as const : [second, first] as const
      if (Math.abs(ordered[0].to - ordered[1].from) > epsilon) {
        throw new IntervalCommandError('NOT_ADJACENT', `Интервалы ${first.id} и ${second.id} не являются смежными.`)
      }
      if (policy.canMerge && !policy.canMerge(ordered[0], ordered[1])) {
        throw new IntervalCommandError('MERGE_FORBIDDEN', `Политика запрещает объединение интервалов ${first.id} и ${second.id}.`)
      }
      assertUniqueId(current, command.newId, [first.id, second.id])
      const merged = policy.mergeAttributes ? policy.mergeAttributes(ordered[0], ordered[1]) : ordered[0]
      const normalized = { ...merged, id: command.newId, from: ordered[0].from, to: ordered[1].to }
      result = current.filter((item) => item.id !== first.id && item.id !== second.id).concat(normalized)
      break
    }
    case 'stretch': {
      findInterval(current, command.id)
      result = current.map((item) => item.id === command.id ? { ...item, [command.edge]: snap(command.to, policy.snapResolution) } : item)
      break
    }
    case 'shift': {
      findInterval(current, command.id)
      const delta = snap(command.delta, policy.snapResolution)
      result = current.map((item) => item.id === command.id ? { ...item, from: snap(item.from + delta, policy.snapResolution), to: snap(item.to + delta, policy.snapResolution) } : item)
      break
    }
    case 'copy': {
      const source = findInterval(current, command.id)
      assertUniqueId(current, command.newId)
      const offset = snap(command.offset, policy.snapResolution)
      result = [...current, { ...structuredClone(source), id: command.newId, from: snap(source.from + offset, policy.snapResolution), to: snap(source.to + offset, policy.snapResolution) }]
      break
    }
    case 'remove': {
      findInterval(current, command.id)
      result = current.filter((item) => item.id !== command.id)
      break
    }
  }

  return sortedIntervals(result)
}

export function validateIntervals<T extends IntervalRecord>(intervals: T[], policy: IntervalPolicy<T>): IntervalIssue[] {
  const issues: IntervalIssue[] = []
  const sorted = sortedIntervals(intervals)
  const ids = new Set<string>()

  for (const interval of sorted) {
    if (ids.has(interval.id)) issues.push({ severity: 'error', code: 'duplicate-id', intervalIds: [interval.id], message: `Идентификатор интервала ${interval.id} повторяется.` })
    ids.add(interval.id)
    if (!Number.isFinite(interval.from) || !Number.isFinite(interval.to) || interval.from >= interval.to) {
      issues.push({ severity: 'error', code: 'invalid-range', intervalIds: [interval.id], range: { from: interval.from, to: interval.to }, message: `Интервал ${interval.from}–${interval.to}: начало должно быть меньше окончания.` })
      continue
    }
    if (interval.from < policy.coverage.from - epsilon || interval.to > policy.coverage.to + epsilon) {
      issues.push({ severity: 'error', code: 'outside-coverage', intervalIds: [interval.id], range: { from: interval.from, to: interval.to }, message: `Интервал ${interval.from}–${interval.to} выходит за диапазон ${policy.coverage.from}–${policy.coverage.to}.` })
    }
    if (interval.to - interval.from < policy.minimumThickness - epsilon) {
      issues.push({ severity: 'error', code: 'minimum-thickness', intervalIds: [interval.id], range: { from: interval.from, to: interval.to }, message: `Мощность интервала ${interval.id} меньше допустимых ${policy.minimumThickness} м.` })
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!
    const item = sorted[index]!
    if (item.from < previous.to - epsilon) {
      const sameCategory = policy.categoryOf ? policy.categoryOf(previous) === policy.categoryOf(item) : true
      if (policy.overlap === 'forbidden' || (policy.overlap === 'allowed-by-category' && sameCategory)) {
        issues.push({ severity: 'error', code: 'overlap', intervalIds: [previous.id, item.id], range: { from: item.from, to: previous.to }, message: `Перекрытие ${Number((previous.to - item.from).toFixed(3))} м между ${previous.id} и ${item.id}.` })
      }
    } else if (item.from > previous.to + epsilon && policy.gap !== 'allowed') {
      issues.push({ severity: policy.gap, code: 'gap', intervalIds: [previous.id, item.id], range: { from: previous.to, to: item.from }, message: `Неописанный интервал ${previous.to}–${item.from} м.` })
    }
  }

  if (policy.gap !== 'allowed') {
    if (sorted.length === 0 && policy.coverage.to > policy.coverage.from) {
      issues.push({ severity: policy.gap, code: 'gap', intervalIds: [], range: { ...policy.coverage }, message: `Неописан весь диапазон ${policy.coverage.from}–${policy.coverage.to} м.` })
    } else if (sorted.length > 0) {
      const first = sorted[0]!
      const last = sorted.at(-1)!
      if (first.from > policy.coverage.from + epsilon) issues.push({ severity: policy.gap, code: 'gap', intervalIds: [first.id], range: { from: policy.coverage.from, to: first.from }, message: `Неописанный интервал ${policy.coverage.from}–${first.from} м.` })
      if (last.to < policy.coverage.to - epsilon) issues.push({ severity: policy.gap, code: 'gap', intervalIds: [last.id], range: { from: last.to, to: policy.coverage.to }, message: `Неописанный интервал ${last.to}–${policy.coverage.to} м.` })
    }
  }
  return issues
}

export function diffIntervals<T extends IntervalRecord>(baseline: T[], current: T[]): IntervalDiff<T>[] {
  const beforeById = new Map(baseline.map((item) => [item.id, item]))
  const afterById = new Map(current.map((item) => [item.id, item]))
  const ids = new Set([...beforeById.keys(), ...afterById.keys()])
  const diff: IntervalDiff<T>[] = []

  for (const id of ids) {
    const before = beforeById.get(id)
    const after = afterById.get(id)
    if (!before && after) diff.push({ id, type: 'added', after: structuredClone(after), changedFields: Object.keys(after) })
    else if (before && !after) diff.push({ id, type: 'removed', before: structuredClone(before), changedFields: Object.keys(before) })
    else if (before && after) {
      const fields = new Set([...Object.keys(before), ...Object.keys(after)])
      const changedFields = [...fields].filter((field) => JSON.stringify((before as Record<string, unknown>)[field]) !== JSON.stringify((after as Record<string, unknown>)[field]))
      if (changedFields.length > 0) diff.push({ id, type: 'modified', before: structuredClone(before), after: structuredClone(after), changedFields })
    }
  }
  return diff
}

export function createIntervalEditorState<T extends IntervalRecord>(intervals: T[]): IntervalEditorState<T> {
  return { past: [], present: sortedIntervals(cloneIntervals(intervals)), future: [] }
}

export function applyIntervalCommand<T extends IntervalRecord>(state: IntervalEditorState<T>, command: IntervalCommand<T>, policy: IntervalPolicy<T>): IntervalEditorState<T> {
  return {
    past: [...state.past, cloneIntervals(state.present)],
    present: executeIntervalCommand(state.present, command, policy),
    future: [],
  }
}

export function undoIntervalCommand<T extends IntervalRecord>(state: IntervalEditorState<T>): IntervalEditorState<T> {
  const previous = state.past.at(-1)
  if (!previous) return state
  return {
    past: state.past.slice(0, -1),
    present: cloneIntervals(previous),
    future: [cloneIntervals(state.present), ...state.future],
  }
}

export function redoIntervalCommand<T extends IntervalRecord>(state: IntervalEditorState<T>): IntervalEditorState<T> {
  const next = state.future[0]
  if (!next) return state
  return {
    past: [...state.past, cloneIntervals(state.present)],
    present: cloneIntervals(next),
    future: state.future.slice(1),
  }
}
