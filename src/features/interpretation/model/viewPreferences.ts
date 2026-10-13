import { useRef, useState } from 'react'
import { z } from 'zod'
import { initialView } from './tracks'

const scaleSchema = z.object({ min: z.number(), max: z.number(), log: z.boolean().optional() }).refine(s => s.max > s.min && (!s.log || s.min > 0))
const boundedKey = z.string().min(1).max(80)
const preferencesSchema = z.object({
  view: z.object({ source: z.boolean(), rs: z.boolean(), gr: z.boolean(), control: z.boolean(), measurements: z.boolean() }),
  trackWidths: z.record(boundedKey, z.number().min(72).max(360)).refine(p => Object.keys(p).length <= 80),
  trackOrder: z.array(boundedKey).max(80).refine(ids => new Set(ids).size === ids.length),
  scales: z.record(boundedKey, scaleSchema).refine(p => Object.keys(p).length <= 80),
})
export type InterpretationViewPreferences = z.infer<typeof preferencesSchema>
export const interpretationViewKey = (wellId: string) => `kapgeo.interpretation.view.v1:${wellId}`
export const defaultInterpretationView = (): InterpretationViewPreferences => ({ view: { ...initialView }, trackWidths: {}, trackOrder: [], scales: {} })

export function readInterpretationView(wellId: string): InterpretationViewPreferences {
  try { return preferencesSchema.parse(JSON.parse(localStorage.getItem(interpretationViewKey(wellId)) ?? 'null')) }
  catch { return defaultInterpretationView() }
}

/** Display preferences never mutate the interpretation document or its revision/undo history. */
export function useInterpretationView(wellId: string) {
  const [preferences, setPreferences] = useState(() => readInterpretationView(wellId))
  const current = useRef(preferences)
  const [storageError, setStorageError] = useState('')
  const update = (change: (before: InterpretationViewPreferences) => InterpretationViewPreferences) => {
    const next = preferencesSchema.parse(change(current.current))
    current.current = next; setPreferences(next)
    try { localStorage.setItem(interpretationViewKey(wellId), JSON.stringify(next)); setStorageError('') }
    catch { setStorageError('Не удалось сохранить настройки планшета в браузере. Они действуют до закрытия этой рабочей области.') }
  }
  return { preferences, update, storageError, reset: () => update(defaultInterpretationView) }
}
