export type IntervalRecord = {
  id: string
  from: number
  to: number
}

export type IntervalPolicy<T extends IntervalRecord> = {
  coverage: { from: number; to: number }
  overlap: 'forbidden' | 'allowed' | 'allowed-by-category'
  gap: 'error' | 'warning' | 'allowed'
  minimumThickness: number
  snapResolution: number
  categoryOf?: (interval: T) => string
  canMerge?: (first: T, second: T) => boolean
  mergeAttributes?: (first: T, second: T) => T
}

export type IntervalIssue = {
  severity: 'error' | 'warning'
  code: 'duplicate-id' | 'invalid-range' | 'outside-coverage' | 'minimum-thickness' | 'overlap' | 'gap'
  intervalIds: string[]
  range?: { from: number; to: number }
  message: string
}

export type IntervalCommand<T extends IntervalRecord> =
  | { type: 'add'; interval: T }
  | { type: 'update'; id: string; patch: Partial<T> }
  | { type: 'split'; id: string; at: number; newIds: [string, string] }
  | { type: 'merge'; firstId: string; secondId: string; newId: string }
  | { type: 'stretch'; id: string; edge: 'from' | 'to'; to: number }
  | { type: 'shift'; id: string; delta: number }
  | { type: 'copy'; id: string; newId: string; offset: number }
  | { type: 'remove'; id: string }

export type IntervalDiff<T extends IntervalRecord> = {
  id: string
  type: 'added' | 'removed' | 'modified'
  before?: T
  after?: T
  changedFields: string[]
}

export type IntervalEditorState<T extends IntervalRecord> = {
  past: T[][]
  present: T[]
  future: T[][]
}

export class IntervalCommandError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'INVALID_SPLIT' | 'NOT_ADJACENT' | 'MERGE_FORBIDDEN' | 'DUPLICATE_ID', message: string) {
    super(message)
    this.name = 'IntervalCommandError'
  }
}
