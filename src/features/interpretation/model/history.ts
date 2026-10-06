import type { InterpretationDocument } from '../../../entities/interpretation/model/types'

export type DocumentHistory = { past: InterpretationDocument[]; present: InterpretationDocument; future: InterpretationDocument[] }
type Action = { type: 'commit' | 'reset'; document: InterpretationDocument } | { type: 'undo' | 'redo' }
function fingerprint(document: InterpretationDocument) {
  return JSON.stringify({ ...document, revision: 0 }, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value)
}
export const sameDocument = (a: InterpretationDocument, b: InterpretationDocument) => fingerprint(a) === fingerprint(b)
export function historyReducer(state: DocumentHistory, action: Action): DocumentHistory {
  if (action.type === 'reset') return { past: [], present: action.document, future: [] }
  if (action.type === 'commit') return sameDocument(state.present, action.document) ? state : { past: [...state.past, state.present].slice(-40), present: action.document, future: [] }
  if (action.type === 'undo') {
    const previous = state.past.at(-1)
    return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state
  }
  const next = state.future[0]
  return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state
}
