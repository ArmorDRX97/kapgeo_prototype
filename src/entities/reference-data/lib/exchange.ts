import { referenceDefinition } from '../model/catalog'
import { referenceNameKey, type ReferenceDefinition, type ReferenceValue, type ReferenceWorkspace } from '../model/types'

export type ExchangeFormat = 'json' | 'xml' | 'csv'
type WireValues = Record<string, unknown>
export type ExchangeRow = { values: WireValues; location: string }
export type ExchangePackage = { referenceItems: ExchangeRow[]; colors: ExchangeRow[] }

export class ExchangeError extends Error {
  constructor(readonly code: string, message: string, readonly location = '') { super(message) }
}

const columns = ['code', 'name', 'name_kk', 'name_en', 'description', 'status', 'sort_order', 'valid_from', 'valid_to', 'color_code']
const colorColumns = ['code', 'name', 'name_kk', 'name_en', 'hex']
export const maxImportBytes = 50 * 1024 * 1024

export function wireField(definition: ReferenceDefinition, key: string) {
  if (key === referenceNameKey(definition)) return 'name'
  if (key === 'color_id') return 'color_code'
  if (key === 'parent_id') return 'attr.parent'
  return columns.includes(key) ? key : `attr.${key}`
}

function csvCell(value: unknown) {
  const str = String(value ?? '')
  return /[;"\r\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str
}

export function exportReference(workspace: ReferenceWorkspace, definition: ReferenceDefinition, format: ExchangeFormat, actor: string, now = new Date()) {
  const entries = new Map(workspace.entries.map(entry => [entry.id, entry]))
  const colors = new Map(workspace.colors?.filter(color => !color.deleted).map(color => [color.id, color]))
  const usedColors = new Set<string>()
  const fields = definition.fields.filter(field => !field.internal && field.key !== 'is_active')
  const referenceItems = workspace.entries.filter(entry => entry.dictionaryId === definition.id).map(entry => {
    const values: Record<string, ReferenceValue> = { reference_type_code: definition.id, status: entry.active ? 'ACTIVE' : 'INACTIVE' }
    for (const field of fields) {
      const raw = entry.values[field.key] ?? null
      let value = raw
      if (raw && field.type === 'reference') value = entries.get(String(raw))?.values.code ?? null
      if (raw && field.type === 'color') {
        const color = colors.get(String(raw))
        if (color) usedColors.add(color.id)
        value = color?.code ?? null
      }
      values[wireField(definition, field.key)] = value
    }
    return values
  })
  const data = {
    formatVersion: 1, sourceInstallation: 'KAPGEO-demo', exportedAt: now.toISOString(), exportedBy: actor,
    colors: [...usedColors].map(id => {
      const color = colors.get(id)!
      return { code: color.code, name: color.name, name_kk: color.nameKk, name_en: color.nameEn, hex: color.hex }
    }),
    referenceItems: referenceItems.map(item => {
      const attributes: Record<string, ReferenceValue> = {}
      const values: Record<string, ReferenceValue> = {}
      for (const [key, value] of Object.entries(item)) {
        if (key.startsWith('attr.')) attributes[key.slice(5)] = value
        else values[key] = value
      }
      return { ...values, attributes }
    }),
  }
  const stamp = now.toISOString().slice(0, 16).replaceAll('-', '').replaceAll(':', '').replace('T', '_')
  if (format === 'csv') {
    const header = [...columns, ...fields.map(field => wireField(definition, field.key)).filter(key => key.startsWith('attr.'))]
    const body = referenceItems.map(item => header.map(key => csvCell(item[key])).join(';'))
    return { name: `nsi_${definition.id}_${stamp}.csv`, mime: 'text/csv;charset=utf-8', text: [header.join(';'), ...body].join('\r\n') }
  }
  if (format === 'json') return { name: `nsi_${definition.id}_${stamp}.json`, mime: 'application/json', text: JSON.stringify(data, null, 2) }
  const doc = document.implementation.createDocument('', 'nsiPackage')
  const root = doc.documentElement
  root.setAttribute('formatVersion', String(data.formatVersion))
  root.setAttribute('exportedAt', data.exportedAt)
  root.setAttribute('exportedBy', actor)
  root.setAttribute('sourceInstallation', data.sourceInstallation)
  const append = (tag: string, values: WireValues) => {
    const row = doc.createElement(tag)
    for (const [key, value] of Object.entries(values)) {
      if (value === null) continue
      const field = doc.createElement(key)
      field.textContent = String(value)
      row.append(field)
    }
    root.append(row)
  }
  data.colors.forEach(color => append('color', color))
  referenceItems.forEach(item => append('referenceItem', item))
  return { name: `nsi_${definition.id}_${stamp}.xml`, mime: 'application/xml', text: new XMLSerializer().serializeToString(doc) }
}

function csvRows(text: string) {
  const rows: { cells: string[]; line: number }[] = []
  let row: string[] = [], cell = '', quoted = false, closed = false, line = 1, rowLine = 1
  const pushCell = () => { row.push(cell); cell = ''; closed = false }
  const pushRow = () => {
    pushCell()
    if (row.some(Boolean)) rows.push({ cells: row, line: rowLine })
    row = []
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++ }
      else if (char === '"') { quoted = false; closed = true }
      else { cell += char; if (char === '\n') line++ }
    } else if (char === ';') pushCell()
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      pushRow(); rowLine = ++line
    } else if (char === '"' && !cell && !closed) quoted = true
    else if (closed || char === '"') throw new ExchangeError('NSI_IMP_FORMAT', 'Некорректные кавычки в CSV.', String(line))
    else cell += char
  }
  if (quoted) throw new ExchangeError('NSI_IMP_FORMAT', 'В CSV есть незакрытые кавычки.', String(rowLine))
  pushRow()
  return rows
}

function parseCsv(text: string, filename: string, fallback?: string): ExchangePackage {
  const rawName = filename.replace(/\.csv$/i, '')
  const inferred = rawName.match(/^nsi_(.+)_\d{8}_\d{4}$/)?.[1] ?? rawName
  const isColors = inferred === 'colors'
  const dictionary = referenceDefinition(inferred) ? inferred : fallback ?? inferred
  const [header, ...rows] = csvRows(text)
  const fields = header?.cells ?? []
  const definition = referenceDefinition(dictionary)
  if (!isColors && !definition) throw new ExchangeError('NSI_IMP_REFERENCE_NOT_FOUND', `Справочник «${dictionary}» не найден в системе.`, filename)
  const allowed = isColors ? colorColumns : [...columns, ...definition!.fields.map(field => wireField(definition!, field.key))]
  for (const column of ['code', 'name']) {
    if (!fields.includes(column)) throw new ExchangeError('NSI_IMP_REQUIRED_COLUMN', `Нет обязательной колонки «${column}».`, filename)
  }
  for (const column of fields) {
    if (!allowed.includes(column)) throw new ExchangeError('NSI_IMP_UNKNOWN_COLUMN', `Колонка «${column}» не предусмотрена структурой.`, filename)
    if (fields.indexOf(column) !== fields.lastIndexOf(column)) throw new ExchangeError('NSI_IMP_FORMAT', `Колонка «${column}» повторяется.`, filename)
  }
  const parsed = rows.map(row => {
    const location = `${filename} · строка ${row.line}`
    if (row.cells.length !== fields.length) throw new ExchangeError('NSI_IMP_FORMAT', 'Число колонок не совпадает с заголовком.', location)
    const values = Object.fromEntries(fields.map((field, index) => [field, row.cells[index]]))
    return { values: isColors ? values : { ...values, reference_type_code: dictionary }, location }
  })
  return { referenceItems: isColors ? [] : parsed, colors: isColors ? parsed : [] }
}

function jsonRows(data: unknown, name: string): ExchangeRow[] {
  if (!Array.isArray(data)) throw new ExchangeError('NSI_IMP_FORMAT', `Ожидается массив ${name}.`, name)
  return data.map((values: unknown, index) => {
    const location = `${name}[${index}]`
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new ExchangeError('NSI_IMP_FORMAT', 'Ожидается объект.', location)
    const wire = { ...values } as WireValues
    if (name === 'referenceItems' && Object.hasOwn(wire, 'attributes')) {
      const attributes = wire.attributes
      if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) throw new ExchangeError('NSI_IMP_FORMAT', 'Ожидается объект атрибутов.', location)
      for (const [key, value] of Object.entries(attributes)) {
        const attribute = `attr.${key}`
        if (Object.hasOwn(wire, attribute)) throw new ExchangeError('NSI_IMP_FORMAT', `Атрибут «${key}» указан дважды.`, location)
        wire[attribute] = value
      }
      delete wire.attributes
    }
    return { values: wire, location }
  })
}

function parseText(text: string, filename: string, fallback?: string): ExchangePackage {
  if (/\.csv$/i.test(filename)) return parseCsv(text, filename, fallback)
  if (/\.xml$/i.test(filename)) {
    if (/<!DOCTYPE/i.test(text)) throw new ExchangeError('NSI_IMP_FORMAT', 'В XML пакета не допускается объявление DOCTYPE.')
    const doc = new DOMParser().parseFromString(text, 'application/xml')
    const root = doc.documentElement
    if (root.localName !== 'nsiPackage' || doc.querySelector('parsererror')) throw new ExchangeError('NSI_IMP_FORMAT', 'Ожидается XML с корневым элементом nsiPackage.')
    if (root.hasAttribute('formatVersion') && root.getAttribute('formatVersion') !== '1') throw new ExchangeError('NSI_IMP_FORMAT', 'Версия формата пакета не поддерживается.')
    const result: ExchangePackage = { referenceItems: [], colors: [] }
    for (const [index, row] of Array.from(root.children).entries()) {
      const location = `nsiPackage/${row.localName}[${index + 1}]`
      if (row.localName !== 'referenceItem' && row.localName !== 'color') throw new ExchangeError('NSI_IMP_FORMAT', 'Неизвестный элемент XML.', location)
      const values: WireValues = Object.fromEntries(Array.from(row.attributes).map(attribute => [attribute.name, attribute.value]))
      for (const field of row.children) {
        if (field.childElementCount || Object.hasOwn(values, field.localName)) throw new ExchangeError('NSI_IMP_FORMAT', 'Некорректная структура поля XML.', location)
        Object.defineProperty(values, field.localName, { value: field.textContent, enumerable: true })
      }
      result[row.localName === 'color' ? 'colors' : 'referenceItems'].push({ values, location })
    }
    return result
  }
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new ExchangeError('NSI_IMP_FORMAT', 'Файл не соответствует формату JSON.') }
  if (!data || typeof data !== 'object' || !('referenceItems' in data) && !('colors' in data)) throw new ExchangeError('NSI_IMP_FORMAT', 'Ожидается JSON-пакет со значениями или цветами.')
  if ('formatVersion' in data && data.formatVersion !== 1) throw new ExchangeError('NSI_IMP_FORMAT', 'Версия формата пакета не поддерживается.')
  return {
    referenceItems: jsonRows('referenceItems' in data ? data.referenceItems : [], 'referenceItems'),
    colors: jsonRows('colors' in data ? data.colors : [], 'colors'),
  }
}

function decode(bytes: Uint8Array, location: string) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new ExchangeError('NSI_IMP_ENCODING', 'Файл должен быть в кодировке UTF-8.', location) }
}

export async function readReferencePackage(file: File, fallback?: string): Promise<ExchangePackage> {
  if (file.size > maxImportBytes) throw new ExchangeError('NSI_IMP_FILE_SIZE', 'Размер файла превышает 50 МБ.')
  if (!/\.(json|xml|csv|zip)$/i.test(file.name)) throw new ExchangeError('NSI_IMP_FILE_TYPE', 'Выберите XML, JSON, CSV или ZIP с CSV-файлами.')
  const buffer = await file.arrayBuffer()
  if (!/\.zip$/i.test(file.name)) return parseText(decode(new Uint8Array(buffer), file.name), file.name, fallback)
  const result: ExchangePackage = { referenceItems: [], colors: [] }
  for (const { name, text } of await readCsvArchive(buffer)) {
    const parsed = parseCsv(text, name)
    for (const row of parsed.referenceItems) result.referenceItems.push(row)
    for (const row of parsed.colors) result.colors.push(row)
  }
  return result
}

async function readCsvArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const formatError = () => new ExchangeError('NSI_IMP_FORMAT', 'Ожидается ZIP-архив с CSV-файлами справочников.')
  let end = buffer.byteLength - 22
  while (end >= Math.max(0, buffer.byteLength - 65557) &&
      (view.getUint32(end, true) !== 0x06054b50 || end + 22 + view.getUint16(end + 20, true) !== buffer.byteLength)) end--
  if (end < Math.max(0, buffer.byteLength - 65557)) throw formatError()
  const count = view.getUint16(end + 10, true)
  const directory = view.getUint32(end + 16, true)
  if (view.getUint32(end + 4, true) !== 0 || view.getUint16(end + 8, true) !== count || directory + view.getUint32(end + 12, true) !== end) throw formatError()
  let offset = directory, total = 0
  const files: { name: string; text: string }[] = []
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw formatError()
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true)
    const checksum = view.getUint32(offset + 16, true), compressed = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true)
    const length = view.getUint16(offset + 28, true), local = view.getUint32(offset + 42, true)
    const next = offset + 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
    if (next > end || local + 30 > directory || view.getUint32(local, true) !== 0x04034b50) throw formatError()
    const name = decode(new Uint8Array(buffer, offset + 46, length), 'ZIP')
    offset = next
    if (name.endsWith('/')) continue
    if (!/^[\w.-]+\.csv$/i.test(name) || flags & 1 || (method !== 0 && method !== 8)) throw formatError()
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    if (start + compressed > directory || total + size > maxImportBytes) throw formatError()
    let bytes = new Uint8Array(buffer, start, compressed)
    if (method === 8) {
      const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
      const output = new Uint8Array(size)
      let written = 0
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (written + value.length > size) { await reader.cancel(); throw formatError() }
          output.set(value, written)
          written += value.length
        }
      } catch { throw formatError() } finally { reader.releaseLock() }
      if (written !== size) throw formatError()
      bytes = output
    }
    if (bytes.length !== size || crc32(bytes) !== checksum) throw formatError()
    total += size
    files.push({ name, text: decode(bytes, name) })
  }
  if (!files.length || offset !== end) throw formatError()
  return files
}

const crcTable = Uint32Array.from({ length: 256 }, (_, initial) => {
  let value = initial
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  return value
})

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255]!
  return (crc ^ 0xffffffff) >>> 0
}
