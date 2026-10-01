import { referenceDefinition } from '../model/catalog'
import type { ReferenceEntry, ReferenceValue, ReferenceWorkspace } from '../model/types'

export function validateReferenceValues(dictionaryId: string, values: Record<string, ReferenceValue>, workspace: ReferenceWorkspace, entryId?: string) {
  const definition = referenceDefinition(dictionaryId)
  if (!definition) throw new Error('Справочник не найден.')
  const errors: Record<string, string> = {}
  for (const key of Object.keys(values)) if (!definition.fields.some((field) => field.key === key)) errors[key] = 'Поле не предусмотрено фиксированной схемой.'
  for (const field of definition.fields) {
    const value = values[field.key]
    const empty = value === undefined || value === null || value === ''
    if (field.required && empty) { errors[field.key] = 'Заполните обязательное поле.'; continue }
    if (empty) continue
    if (field.type === 'number' || field.type === 'integer') {
      if (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isSafeInteger(value))) errors[field.key] = field.type === 'integer' ? 'Введите целое число.' : 'Введите число.'
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') errors[field.key] = 'Выберите логическое значение.'
    } else if (typeof value !== 'string') errors[field.key] = 'Введите текстовое значение.'
    else if (field.maxLength && value.length > field.maxLength) errors[field.key] = `Не более ${field.maxLength} символов.`
    if (field.type === 'json' && typeof value === 'string') {
      try { JSON.parse(value) } catch { errors[field.key] = 'Введите корректный JSON.' }
    }
    if (field.type === 'reference') {
      const target = workspace.entries.find((item) => item.dictionaryId === field.reference && item.id === value)
      const previous = workspace.entries.find((item) => item.id === entryId)?.values[field.key]
      if (!target || (!target.active && previous !== value)) errors[field.key] = 'Выберите действующую запись связанного справочника.'
      if (field.key === 'parent_id' || (field.key === 'si' && value !== entryId)) {
        const visited = new Set([entryId])
        let ancestor: ReferenceEntry | undefined = target
        while (ancestor) {
          if (visited.has(ancestor.id)) { errors[field.key] = 'Циклическая ссылка не допускается.'; break }
          visited.add(ancestor.id)
          if (field.key === 'si' && ancestor.values.si === ancestor.id) break
          ancestor = workspace.entries.find((item) => item.dictionaryId === field.reference && item.id === ancestor!.values[field.key])
        }
      }
    }
    if (field.key === 'code' && typeof value === 'string' && workspace.entries.some((item) => item.dictionaryId === dictionaryId && item.id !== entryId && String(item.values.code).trim().toLocaleLowerCase('ru') === value.trim().toLocaleLowerCase('ru'))) errors[field.key] = 'Код уже используется в этом справочнике.'
  }
  if (typeof values.size_from_mm === 'number' && typeof values.size_to_mm === 'number' && (values.size_from_mm < 0 || values.size_to_mm < values.size_from_mm)) errors.size_to_mm = 'Верхняя граница должна быть не меньше нижней; размеры неотрицательны.'
  return errors
}
