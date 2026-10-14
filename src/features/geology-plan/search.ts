export type PlanSearch = { selection?: string }
export function validatePlanSearch(input: Record<string, unknown>): PlanSearch { return { selection: typeof input.selection === 'string' && input.selection.length < 150 ? input.selection : undefined } }
