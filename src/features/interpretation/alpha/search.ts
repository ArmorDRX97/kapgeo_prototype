export type AlphaSearch = { well?: string; from?: number; to?: number; selection?: string; sub?: string }
export function validateAlphaSearch(input: Record<string, unknown>): AlphaSearch {
  const from = Number(input.from), to = Number(input.to)
  return { well: typeof input.well === 'string' ? input.well : undefined,
    ...(Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to > from && to <= 10000 ? { from, to } : {}),
    selection: typeof input.selection === 'string' ? input.selection : undefined, sub: typeof input.sub === 'string' ? input.sub : undefined }
}
