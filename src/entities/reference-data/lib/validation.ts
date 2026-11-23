import { referenceDefinition } from '../model/catalog'
import { referenceNameKey, type ReferenceEntry, type ReferenceValue, type ReferenceWorkspace } from '../model/types'

export function referenceDependents(workspace: ReferenceWorkspace, entry: ReferenceEntry) {
  return workspace.entries.filter(item => item.id !== entry.id && referenceDefinition(item.dictionaryId)?.fields.some(field =>
    field.type === 'reference' && field.reference === entry.dictionaryId && item.values[field.key] === entry.id,
  ))
}

export function referenceChildren(workspace: ReferenceWorkspace, entry: ReferenceEntry) {
  const entries = workspace.entries.filter(item => item.dictionaryId === entry.dictionaryId)
  const children = childrenByParent(entries)
  const visited = new Set([entry.id])
  const result: ReferenceEntry[] = []
  const stack = [...(children.get(entry.id) ?? [])]
  while (stack.length) {
    const child = stack.pop()!
    if (visited.has(child.id)) continue
    visited.add(child.id)
    result.push(child)
    for (const next of children.get(child.id) ?? []) stack.push(next)
  }
  return result
}

function childrenByParent(entries: ReferenceEntry[]) {
  const children = new Map<string, ReferenceEntry[]>()
  for (const entry of entries) {
    const parent = entry.values.parent_id
    if (typeof parent !== 'string') continue
    const items = children.get(parent) ?? []
    items.push(entry)
    children.set(parent, items)
  }
  return children
}

export function referenceTree(entries: ReferenceEntry[]) {
  const children = childrenByParent(entries)
  const ids = new Set(entries.map(entry => entry.id))
  const visited = new Set<string>()
  const result: { entry: ReferenceEntry; depth: number }[] = []
  const roots = entries.filter(entry => !ids.has(String(entry.values.parent_id)))
  const append = (root: ReferenceEntry) => {
    const stack = [{ entry: root, depth: 0 }]
    while (stack.length) {
      const node = stack.pop()!
      if (visited.has(node.entry.id)) continue
      visited.add(node.entry.id)
      result.push(node)
      const items = children.get(node.entry.id) ?? []
      for (let index = items.length - 1; index >= 0; index--) stack.push({ entry: items[index]!, depth: node.depth + 1 })
    }
  }
  roots.forEach(append)
  entries.forEach(append)
  return result
}

export function colorUsage(workspace: ReferenceWorkspace, colorId: string) {
  return workspace.entries.filter(item => referenceDefinition(item.dictionaryId)?.fields.some(field =>
    field.type === 'color' && item.values[field.key] === colorId,
  )).length
}

export function isReferenceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const codeKey = (dictionary: string, value: ReferenceValue | undefined) => JSON.stringify([dictionary, String(value ?? '').toLocaleLowerCase('ru')])
const nameKey = (dictionary: string, values: Record<string, ReferenceValue>) => {
  const definition = referenceDefinition(dictionary)!
  return JSON.stringify([dictionary, definition.hierarchical ? values.parent_id ?? null : null, String(values[referenceNameKey(definition)] ?? '').toLocaleLowerCase('ru')])
}

export function referenceValidationIndex(workspace: ReferenceWorkspace) {
  const entries = new Map<string, ReferenceEntry>()
  const names = new Map<string, string[]>()
  const codes = new Map<string, string[]>()
  const reservedCodes = new Set<string>()
  const colors = new Set(workspace.colors?.filter(color => !color.deleted).map(color => color.id))
  const add = (index: Map<string, string[]>, key: string, id: string) => {
    const members = index.get(key) ?? []
    members.push(id)
    index.set(key, members)
  }
  for (const entry of workspace.entries) {
    entries.set(entry.id, entry)
    add(names, nameKey(entry.dictionaryId, entry.values), entry.id)
    add(codes, codeKey(entry.dictionaryId, entry.values.code), entry.id)
  }
  for (const change of workspace.changes) {
    if (change.operation === 'deleted' && change.before) reservedCodes.add(codeKey(change.dictionaryId, change.before.values.code))
  }
  return { entries, names, codes, reservedCodes, colors }
}

export function validateReferenceValues(dictionaryId: string, values: Record<string, ReferenceValue>, workspace: ReferenceWorkspace, entryId?: string, index = referenceValidationIndex(workspace)) {
  const definition = referenceDefinition(dictionaryId)
  if (!definition) throw new Error('Справочник не найден.')
  const errors: Record<string, string> = {}
  const previousEntry = entryId ? index.entries.get(entryId) : undefined
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
    if (field.type === 'date' && typeof value === 'string' && !isReferenceDate(value)) errors[field.key] = 'Укажите корректную дату.'
    if (field.type === 'color' && !index.colors.has(String(value))) errors[field.key] = 'Выберите цвет из справочника цветов.'
    if (typeof value === 'number' || typeof value === 'string') {
      if (field.min !== undefined && value < field.min) errors[field.key] = `Минимальное значение — ${field.min}.`
      if (field.max !== undefined && value > field.max) errors[field.key] = `Максимальное значение — ${field.max}.`
      if (field.pattern && typeof value === 'string' && !new RegExp(field.pattern).test(value)) errors[field.key] = 'Значение не соответствует формату.'
    }
    if (field.unique && workspace.entries.some(item => item.dictionaryId === dictionaryId && item.id !== entryId && item.values[field.key] === value)) errors[field.key] = 'Значение атрибута уже используется.'
    if (field.type === 'json' && typeof value === 'string') {
      try { JSON.parse(value) } catch { errors[field.key] = 'Введите корректный JSON.' }
    }
    if (field.type === 'reference') {
      const candidate = index.entries.get(String(value))
      const target = candidate?.dictionaryId === field.reference ? candidate : undefined
      const previous = previousEntry?.values[field.key]
      if (!target || (!target.active && previous !== value)) errors[field.key] = 'Выберите действующую запись связанного справочника.'
      if (field.key !== 'parent_id' && target?.values.is_group && previous !== value) errors[field.key] = 'Выберите значение внутри группы.'
      if (field.key === 'parent_id' || (field.key === 'si' && value !== entryId)) {
        const visited = new Set([entryId])
        let ancestor: ReferenceEntry | undefined = target
        while (ancestor) {
          if (visited.has(ancestor.id)) { errors[field.key] = 'Циклическая ссылка не допускается.'; break }
          visited.add(ancestor.id)
          if (field.key === 'si' && ancestor.values.si === ancestor.id) break
          ancestor = index.entries.get(String(ancestor.values[field.key]))
        }
      }
    }
    if (field.key === 'code' && typeof value === 'string') {
      const key = codeKey(dictionaryId, value)
      const usedCode = index.reservedCodes.has(key) || index.codes.get(key)?.some(id => id !== entryId)
      if (usedCode) errors.code = 'Значение с таким кодом уже есть в справочнике.'
      if (previousEntry && value !== previousEntry.values.code && (definition.autoCode || referenceDependents(workspace, previousEntry).length)) errors.code = 'Код значения недоступен для изменения.'
    }
  }
  const primaryName = referenceNameKey(definition)
  if (values[primaryName] && index.names.get(nameKey(dictionaryId, values))?.some(id => id !== entryId)) errors[primaryName] = 'Значение с таким наименованием уже есть в справочнике.'
  if (values.valid_from && values.valid_to && String(values.valid_to) < String(values.valid_from)) errors.valid_to = 'Дата «Действует по» раньше даты «Действует с».'
  if (typeof values.size_from_mm === 'number' && typeof values.size_to_mm === 'number' && (values.size_from_mm < 0 || values.size_to_mm < values.size_from_mm)) errors.size_to_mm = 'Верхняя граница должна быть не меньше нижней; размеры неотрицательны.'
  return errors
}
