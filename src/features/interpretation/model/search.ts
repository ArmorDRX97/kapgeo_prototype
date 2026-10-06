import type { InterpretationMode } from '../../../entities/interpretation/model/types'

export type InterpretationSearch = { well?: string; mode?: InterpretationMode; from?: number; to?: number; selection?: string }
export function validateInterpretationSearch(input: Record<string, unknown>): InterpretationSearch {
  const from = Number(input.from), to = Number(input.to)
  const validRange = Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to > from && to <= 160
  return { well: typeof input.well === 'string' ? input.well : undefined,
    mode: input.mode === 'technology' || input.mode === 'core' || input.mode === 'lithology' ? input.mode : undefined,
    ...(validRange ? { from, to } : {}), selection: typeof input.selection === 'string' ? input.selection : undefined }
}
