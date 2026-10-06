import type { CoreSegment, DemoSample, InterpretationDocument, InterpretationWell, LithologyInterval } from '../model/types'
import { roundDepth } from './calculation'

const EPS = 0.00001
const precise = (v: number) => Number(v.toFixed(6))
export const isNoCore = (segment: CoreSegment) => segment.kind === 'no-core' || segment.sourceId === null
export function sourceOf(well: InterpretationWell, segment: CoreSegment) {
  const raw = isNoCore(segment) ? undefined : well.core.find(s => s.id === (segment.sourceId ?? segment.id))
  return raw ? { ...raw, from: segment.sourceFrom ?? raw.from, to: segment.sourceTo ?? raw.to } : undefined
}
export function hasMeasurement(well: InterpretationWell, segment: CoreSegment) {
  const source = sourceOf(well, segment)
  const raw = well.core.find(s => s.id === (segment.sourceId ?? segment.id))
  return !!source?.measurements.some(p => p.depth >= source.from && (p.depth < source.to || p.depth === source.to && source.to === raw?.to))
}
export function mappedRange(source: { from: number; to: number }, segment: CoreSegment, from: number, to: number): [number, number] {
  const ratio = (segment.to - segment.from) / (source.to - source.from)
  const map = (d: number) => precise(segment.reversed ? segment.to - (d - source.from) * ratio : segment.from + (d - source.from) * ratio)
  const a = map(from), b = map(to)
  return [Math.min(a, b), Math.max(a, b)]
}
export function initialMapping(well: InterpretationWell): CoreSegment[] {
  return well.runs.flatMap(run => {
    const sources = well.core.filter(s => s.runId === run.id).sort((a, b) => a.from - b.from)
    const rows: CoreSegment[] = []; let cursor = run.from
    const gap = (from: number, to: number) => ({ id: `gap-${run.id}-${from}`, runId: run.id, from, to, reversed: false, kind: 'no-core' as const, sourceId: null, sourceFrom: from, sourceTo: to })
    for (const s of sources) {
      if (s.from > cursor) rows.push(gap(cursor, s.from))
      rows.push({ id: s.id, runId: run.id, from: s.from, to: s.to, reversed: false, kind: 'core', sourceId: s.id, sourceFrom: s.from, sourceTo: s.to }); cursor = s.to
    }
    if (cursor < run.to) rows.push(gap(cursor, run.to))
    return rows
  })
}
export function mappedCore(well: InterpretationWell, doc: InterpretationDocument): LithologyInterval[] {
  return doc.core.flatMap(segment => {
    if (segment.to <= segment.from) return []
    if (isNoCore(segment)) return [{ id: `${segment.id}:gap`, from: segment.from, to: segment.to, rock: 'unknown' as const, mineralization: '', note: 'Без керна', ...segment.properties, color: undefined }]
    const source = sourceOf(well, segment)
    return source ? source.lithology.flatMap(row => {
      const start = Math.max(row.from, source.from), end = Math.min(row.to, source.to)
      if (end <= start) return []
      const [from, to] = mappedRange(source, segment, start, end)
      return [{ ...row, ...segment.properties, id: `${segment.id}:${row.id}`, from, to }]
    }) : []
  }).sort((a, b) => a.from - b.from)
}
export function mappedMeasurements(well: InterpretationWell, doc: InterpretationDocument) {
  return doc.core.flatMap(segment => {
    const source = sourceOf(well, segment)
    const raw = well.core.find(s => s.id === (segment.sourceId ?? segment.id))
    return source && segment.to > segment.from ? source.measurements.filter(p => p.depth >= source.from && (p.depth < source.to || p.depth === source.to && source.to === raw?.to)).map(p => ({ ...p, segmentId: segment.id, depth: mappedRange(source, segment, p.depth, p.depth)[0] })) : []
  }).sort((a, b) => a.depth - b.depth)
}
export function mappedSamples(well: InterpretationWell, doc: InterpretationDocument) {
  return (doc.samples ?? well.samples).flatMap(sample => sample.parts.flatMap((part, i) => doc.core.flatMap(segment => {
    if (isNoCore(segment) || (segment.sourceId ?? segment.id) !== part.segmentId || segment.to <= segment.from) return []
    const source = sourceOf(well, segment)
    if (!source) return []
    const sourceFrom = Math.max(part.from, source.from), sourceTo = Math.min(part.to, source.to)
    if (sourceTo <= sourceFrom) return []
    const [from, to] = mappedRange(source, segment, sourceFrom, sourceTo)
    return [{ ...sample, kind: sample.kind ?? 'KP', id: `${sample.id}-${i}-${segment.id}`, sampleId: sample.id, sourceFrom, sourceTo, from, to, segmentId: segment.id }]
  })))
}
export function sourceIssues(well: InterpretationWell): string[] {
  const issues: string[] = []
  for (const run of well.runs) {
    const rows = well.core.filter(s => s.runId === run.id)
    if (Math.abs(rows.reduce((sum, s) => sum + s.to - s.from, 0) - run.recovered) > EPS) issues.push(`Рейс ${run.from}–${run.to}: мощность керна не равна выходу.`)
    for (const s of rows) {
      if (s.from < run.from || s.to > run.to) issues.push(`Сегмент ${s.id} выходит за рейс.`)
      if (Math.abs(s.lithology.reduce((sum, r) => sum + r.to - r.from, 0) - (s.to - s.from)) > EPS) issues.push(`Сегмент ${s.id}: сумма литологии не совпадает с мощностью.`)
      const ordered = [...s.lithology].sort((a, b) => a.from - b.from)
      let cursor = s.from
      for (const row of ordered) {
        if (!row.color || row.from < s.from || row.to > s.to || Math.abs(row.from - cursor) > EPS) issues.push(`Разность ${row.id}: проверьте цвет и границы керна.`)
        cursor = row.to
      }
      if (s.measurements.some(p => !Number.isFinite(p.value) || p.depth < s.from || p.depth > s.to)) issues.push(`Промер ${s.id} попадает вне керна.`)
    }
  }
  for (const sample of well.samples) for (const part of sample.parts) {
    const s = well.core.find(x => x.id === part.segmentId)
    if (!s || part.from < s.from || part.to > s.to || part.to <= part.from) issues.push(`Проба ${sample.name} попадает в бескерновую область.`)
  }
  return issues
}
export function validateMapping(well: InterpretationWell, doc: InterpretationDocument) {
  if (new Set(doc.core.map(s => s.id)).size !== doc.core.length) throw new Error('Повторяющиеся идентификаторы сегментов.')
  const visible = doc.core.filter(s => s.to > s.from).sort((a, b) => a.from - b.from)
  for (let i = 0; i < visible.length; i++) if (i && visible[i]!.from < visible[i - 1]!.to - EPS) throw new Error('Сводные сегменты перекрываются.')
  for (const segment of doc.core) {
    if (![segment.from, segment.to].every(Number.isFinite) || segment.from < 0 || segment.to > well.depth || segment.to < segment.from || !well.runs.some(r => r.id === segment.runId)) throw new Error('Сегмент выходит за допустимую глубину или рейс не найден.')
    if ((segment.sourceFrom === undefined) !== (segment.sourceTo === undefined) || (segment.sourceFrom !== undefined && segment.sourceTo! <= segment.sourceFrom)) throw new Error('Нарушен исходный диапазон сегмента.')
    if (isNoCore(segment)) { if (segment.properties?.color) throw new Error('Бескерновый сегмент не имеет цвета керна.'); continue }
    const s = sourceOf(well, segment), raw = well.core.find(x => x.id === (segment.sourceId ?? segment.id))
    if (!s || !raw || s.runId !== segment.runId || s.from < raw.from || s.to > raw.to || s.to <= s.from) throw new Error('Нарушен исходный диапазон керна.')
    const size = segment.to - segment.from
    if (hasMeasurement(well, segment) && ![0, 0.1, s.to - s.from].some(value => Math.abs(size - value) < EPS)) throw new Error('С промером допустима исходная мощность, 0,1 м или 0.')
  }
  for (const source of well.core) {
    const slices = doc.core.filter(s => !isNoCore(s) && (s.sourceId ?? s.id) === source.id).map(s => sourceOf(well, s)!).sort((a, b) => a.from - b.from)
    let cursor = source.from
    for (const s of slices) { if (Math.abs(s.from - cursor) > EPS) throw new Error('Исходный керн потерян или представлен дважды.'); cursor = s.to }
    if (Math.abs(cursor - source.to) > EPS) throw new Error('Исходный керн потерян. Сохраняйте удалённые сегменты для восстановления.')
  }
}
export function syncCore(well: InterpretationWell, doc: InterpretationDocument): InterpretationDocument {
  validateMapping(well, doc)
  const from = Math.min(...well.runs.map(r => r.from), ...doc.core.map(s => s.from)), to = Math.max(...well.runs.map(r => r.to), ...doc.core.map(s => s.to))
  const outside = doc.compositeLithology.flatMap(r => {
    if (r.to <= from || r.from >= to) return [r]
    const pieces: LithologyInterval[] = []
    if (r.from < from) pieces.push({ ...r, to: from })
    if (r.to > to) pieces.push({ ...r, id: `${r.id}-outside`, from: to })
    return pieces
  })
  return { ...doc, core: [...doc.core].sort((a, b) => a.from - b.from), compositeLithology: [...outside, ...mappedCore(well, doc)].sort((a, b) => a.from - b.from) }
}
export function derivedRuns(well: InterpretationWell, doc: InterpretationDocument) {
  return well.runs.map(run => {
    const segments = doc.core.filter(s => s.runId === run.id && s.to > s.from)
    const from = segments.length ? Math.min(...segments.map(s => s.from)) : run.from, to = segments.length ? Math.max(...segments.map(s => s.to)) : from
    const recovered = segments.filter(s => !isNoCore(s)).reduce((sum, s) => sum + s.to - s.from, 0)
    return { ...run, from, to, recovered, percent: to > from ? recovered / (to - from) * 100 : 0 }
  })
}
const uniqueId = (doc: InterpretationDocument, base: string) => { let id = base, n = 1; while (doc.core.some(s => s.id === id)) id = `${base}-${n++}`; return id }
export function splitCore(well: InterpretationWell, doc: InterpretationDocument, id: string, at: number) {
  const s = doc.core.find(x => x.id === id)
  if (!s || at - s.from < 0.099 || s.to - at < 0.099) throw new Error('Разделение должно находиться внутри видимого сегмента.')
  at = roundDepth(at)
  const source = sourceOf(well, s)
  const ratio = (at - s.from) / (s.to - s.from)
  const cut = source ? precise(s.reversed ? source.to - ratio * (source.to - source.from) : source.from + ratio * (source.to - source.from)) : undefined
  const a: CoreSegment = { ...s, to: at }, b: CoreSegment = { ...s, id: uniqueId(doc, `${id}-split`), from: at }
  if (source && cut !== undefined) {
    a.sourceId = b.sourceId = s.sourceId ?? s.id
    a.sourceFrom = s.reversed ? cut : source.from; a.sourceTo = s.reversed ? source.to : cut
    b.sourceFrom = s.reversed ? source.from : cut; b.sourceTo = s.reversed ? cut : source.to
  } else if (s.sourceFrom !== undefined && s.sourceTo !== undefined) {
    const originCut = s.sourceFrom + ratio * (s.sourceTo - s.sourceFrom)
    a.sourceTo = originCut; b.sourceFrom = originCut
  }
  return syncCore(well, { ...doc, core: doc.core.flatMap(x => x.id === id ? [a, b] : [x]) })
}
export function mergeCore(well: InterpretationWell, doc: InterpretationDocument, id: string, direction: 'above' | 'below') {
  const rows = [...doc.core].filter(s => s.to > s.from).sort((a, b) => a.from - b.from), index = rows.findIndex(s => s.id === id)
  const s = rows[index], neighbour = rows[index + (direction === 'above' ? -1 : 1)]
  if (!s || !neighbour || s.runId !== neighbour.runId || isNoCore(s) !== isNoCore(neighbour) || Math.abs((direction === 'above' ? neighbour.to - s.from : s.to - neighbour.from)) > EPS) throw new Error('Объединять можно только прилегающие сегменты одного типа и рейса.')
  const source = sourceOf(well, s), other = sourceOf(well, neighbour)
  if (!source && ((s.sourceFrom === undefined) !== (neighbour.sourceFrom === undefined) || (s.sourceFrom !== undefined && Math.min(Math.abs(s.sourceTo! - neighbour.sourceFrom!), Math.abs(neighbour.sourceTo! - s.sourceFrom)) > EPS))) throw new Error('Бескерновые части должны иметь совместимое происхождение и прилегать в исходном рейсе.')
  if (source && other && ((s.sourceId ?? s.id) !== (neighbour.sourceId ?? neighbour.id) || s.reversed !== neighbour.reversed || hasMeasurement(well, s) !== hasMeasurement(well, neighbour) || Math.min(Math.abs(source.to - other.from), Math.abs(other.to - source.from)) > EPS)) throw new Error('Керн должен прилегать по буровой колонке и иметь одинаковое наличие промера и ориентацию.')
  const merged = { ...s, from: Math.min(s.from, neighbour.from), to: Math.max(s.to, neighbour.to), sourceFrom: source && other ? Math.min(source.from, other.from) : s.sourceFrom !== undefined ? Math.min(s.sourceFrom, neighbour.sourceFrom!) : undefined, sourceTo: source && other ? Math.max(source.to, other.to) : s.sourceTo !== undefined ? Math.max(s.sourceTo, neighbour.sourceTo!) : undefined, properties: source ? undefined : s.properties }
  return syncCore(well, { ...doc, core: doc.core.filter(x => x.id !== neighbour.id).map(x => x.id === s.id ? merged : x) })
}
export function resizeCore(well: InterpretationWell, doc: InterpretationDocument, id: string, thickness: number, anchor: 'top' | 'bottom') {
  const s = doc.core.find(x => x.id === id)
  thickness = roundDepth(thickness)
  if (!s || !Number.isFinite(thickness) || thickness < 0) throw new Error('Укажите неотрицательную мощность.')
  const delta = thickness - (s.to - s.from)
  const index = doc.core.findIndex(x => x.id === id)
  const core = doc.core.map(x => {
    if (x.id === id) return anchor === 'top' ? { ...x, to: precise(x.from + thickness) } : { ...x, from: precise(x.to - thickness) }
    const position = doc.core.indexOf(x)
    const shift = anchor === 'top' ? x.from > s.to + EPS || (Math.abs(x.from - s.to) < EPS && position > index) : x.to < s.from - EPS || (Math.abs(x.to - s.from) < EPS && position < index)
    return shift ? { ...x, from: precise(x.from + (anchor === 'top' ? delta : -delta)), to: precise(x.to + (anchor === 'top' ? delta : -delta)) } : x
  })
  return syncCore(well, { ...doc, core })
}
export function deleteCore(well: InterpretationWell, doc: InterpretationDocument, id: string) {
  const next = resizeCore(well, doc, id, 0, 'top'), s = next.core.find(x => x.id === id)!
  return isNoCore(s) && s.sourceFrom === undefined ? { ...next, core: next.core.filter(x => x.id !== id) } : next
}
export function restoreCore(well: InterpretationWell, doc: InterpretationDocument, id: string) {
  const s = doc.core.find(x => x.id === id), source = s && sourceOf(well, s)
  const size = source ? source.to - source.from : s?.sourceTo !== undefined && s.sourceFrom !== undefined ? s.sourceTo - s.sourceFrom : 0
  if (!size) throw new Error('У сегмента нет исходной мощности.')
  return resizeCore(well, doc, id, size, 'top')
}
export function insertNoCore(well: InterpretationWell, doc: InterpretationDocument, id: string, thickness: number) {
  const s = doc.core.find(x => x.id === id)
  thickness = roundDepth(thickness)
  if (!s || !Number.isFinite(thickness) || thickness < 0.1) throw new Error('Укажите мощность вставки не менее 0,1 м.')
  const gap: CoreSegment = { id: uniqueId(doc, 'inserted-gap'), kind: 'no-core', sourceId: null, runId: s.runId, from: s.to, to: s.to + thickness, reversed: false }
  return syncCore(well, { ...doc, core: [...doc.core.map(x => x.from >= s.to - EPS && x.id !== id ? { ...x, from: x.from + thickness, to: x.to + thickness } : x), gap] })
}
export function moveCore(well: InterpretationWell, doc: InterpretationDocument, id: string, direction: 'above' | 'below') {
  const rows = doc.core.filter(s => s.to > s.from).sort((a, b) => a.from - b.from), i = rows.findIndex(s => s.id === id)
  const s = rows[i], other = rows[i + (direction === 'above' ? -1 : 1)]
  if (!s || !other || s.runId !== other.runId || Math.abs((direction === 'above' ? other.to - s.from : s.to - other.from)) > EPS) throw new Error('Перестановка допустима с соседним сегментом своего рейса.')
  const from = Math.min(s.from, other.from), first = direction === 'above' ? s : other, second = direction === 'above' ? other : s
  const relocated = [{ ...first, from, to: from + first.to - first.from }, { ...second, from: from + first.to - first.from, to: Math.max(s.to, other.to) }]
  return syncCore(well, { ...doc, core: doc.core.map(x => relocated.find(r => r.id === x.id) ?? x) })
}
export function moveCoreContact(well: InterpretationWell, doc: InterpretationDocument, id: string, at: number) {
  const rows = doc.core.filter(s => s.to > s.from).sort((a, b) => a.from - b.from), index = rows.findIndex(s => s.id === id), s = rows[index], next = rows[index + 1]
  at = roundDepth(at)
  if (!s || !next || s.runId !== next.runId || Math.abs(s.to - next.from) > EPS || at <= s.from || at >= next.to) throw new Error('Выберите контакт двух соседей внутри рейса.')
  return syncCore(well, { ...doc, core: doc.core.map(x => x.id === id ? { ...x, to: at } : x.id === next.id ? { ...x, from: at } : x) })
}
export function transformCore(well: InterpretationWell, doc: InterpretationDocument, id: string, from: number, reversed: boolean): InterpretationDocument {
  const s = doc.core.find(x => x.id === id), run = well.runs.find(r => r.id === s?.runId)
  if (!s || !run) throw new Error('Керновый сегмент не найден.')
  from = roundDepth(from)
  const to = precise(from + s.to - s.from)
  if (!Number.isFinite(from) || from < run.from || to > run.to) throw new Error('Числовая привязка должна оставаться внутри исходного рейса. Для каскадных изменений используйте операции ниже.')
  // Adjacent no-core pieces absorb a direct shift; linked recovered pieces never overlap.
  const delta = from - s.from
  const core = doc.core.map(x => x.id === id ? { ...x, from, to, reversed } : isNoCore(x) && x.runId === s.runId && Math.abs(x.from - s.to) < EPS ? { ...x, from: x.from + delta } : isNoCore(x) && x.runId === s.runId && Math.abs(x.to - s.from) < EPS ? { ...x, to: x.to + delta } : x)
  let cursor = run.from
  for (const x of core.filter(x => x.runId === run.id && x.to > x.from).sort((a, b) => a.from - b.from)) {
    if (x.from > cursor + EPS) core.push({ id: uniqueId({ ...doc, core }, `gap-shift-${id}-${cursor}`), sourceId: null, kind: 'no-core', runId: s.runId, from: cursor, to: x.from, reversed: false })
    cursor = x.to
  }
  if (cursor < run.to - EPS) core.push({ id: uniqueId({ ...doc, core }, `gap-shift-${id}-end`), sourceId: null, kind: 'no-core', runId: s.runId, from: cursor, to: run.to, reversed: false })
  // Original mappings may have implicit gaps. Source fragments remain reversible.
  return syncCore(well, { ...doc, core })
}
export function resetCoreMapping(well: InterpretationWell, doc: InterpretationDocument) {
  return syncCore(well, { ...doc, core: initialMapping(well), samples: structuredClone(well.samples), sourceRevision: well.sourceRevision })
}
export function flipRun(well: InterpretationWell, doc: InterpretationDocument, runId: string) {
  const run = derivedRuns(well, doc).find(r => r.id === runId)
  if (!run) throw new Error('Рейс не найден.')
  return syncCore(well, { ...doc, core: doc.core.map(s => s.runId === runId ? { ...s, from: precise(run.from + run.to - s.to), to: precise(run.from + run.to - s.from), reversed: !isNoCore(s) && !s.reversed } : s) })
}
export function moveRun(well: InterpretationWell, doc: InterpretationDocument, runId: string, direction: 'above' | 'below') {
  const runs = derivedRuns(well, doc).sort((a, b) => a.from - b.from), i = runs.findIndex(r => r.id === runId), s = runs[i], neighbour = runs[i + (direction === 'above' ? -1 : 1)]
  if (!s || !neighbour || Math.abs(direction === 'above' ? neighbour.to - s.from : s.to - neighbour.from) > EPS) throw new Error('Перестановка рейсов требует прилегания сводных диапазонов.')
  const shift = direction === 'above' ? -(neighbour.to - neighbour.from) : neighbour.to - neighbour.from
  const otherShift = direction === 'above' ? s.to - s.from : -(s.to - s.from)
  return syncCore(well, { ...doc, core: doc.core.map(x => x.runId === s.id ? { ...x, from: precise(x.from + shift), to: precise(x.to + shift) } : x.runId === neighbour.id ? { ...x, from: precise(x.from + otherShift), to: precise(x.to + otherShift) } : x) })
}
export function updateSample(well: InterpretationWell, doc: InterpretationDocument, value: { id: string; name: string; kind: DemoSample['kind']; from: number; to: number; assay?: number; replacePart?: { segmentId: string; from: number; to: number } }) {
  if (!value.name.trim() || !Number.isFinite(value.from) || !Number.isFinite(value.to) || value.to - value.from < 0.099) throw new Error('Укажите номер и диапазон пробы не менее 0,1 м.')
  const segment = doc.core.find(s => !isNoCore(s) && s.to > s.from && value.from >= s.from - EPS && value.to <= s.to + EPS)
  const source = segment && sourceOf(well, segment)
  if (!segment || !source) throw new Error('Проба должна находиться целиком в одном керновом сегменте и рейсе.')
  const reverse = (d: number) => precise(segment.reversed ? source.from + (segment.to - d) / (segment.to - segment.from) * (source.to - source.from) : source.from + (d - segment.from) / (segment.to - segment.from) * (source.to - source.from))
  const a = reverse(value.from), b = reverse(value.to), part = { segmentId: segment.sourceId ?? segment.id, from: Math.min(a, b), to: Math.max(a, b) }
  const existing = (doc.samples ?? well.samples).find(s => s.id === value.id)
  const samples: DemoSample[] = []
  // Overwrite is scoped to the same material and original core source, not to laboratory results of other materials.
  for (const sample of doc.samples ?? well.samples) {
    if (sample.id === value.id) continue
    if ((sample.kind ?? 'KP') !== (value.kind ?? 'KP')) { samples.push(sample); continue }
    const parts = sample.parts.flatMap(p => {
      if (p.segmentId !== part.segmentId || p.to <= part.from || p.from >= part.to) return [p]
      const pieces = []
      if (p.from < part.from) pieces.push({ ...p, to: part.from })
      if (p.to > part.to) pieces.push({ ...p, from: part.to })
      return pieces
    })
    if (parts.length) samples.push({ ...sample, parts })
  }
  const untouched = existing?.parts.flatMap(p => {
    const old = value.replacePart
    if (!old) return []
    if (p.segmentId !== old.segmentId || p.to <= old.from || p.from >= old.to) return [p]
    const pieces = []
    if (p.from < old.from) pieces.push({ ...p, to: old.from })
    if (p.to > old.to) pieces.push({ ...p, from: old.to })
    return pieces
  }) ?? []
  samples.push({ id: value.id, name: value.name.trim(), kind: value.kind ?? 'KP', assay: existing?.assay ?? value.assay ?? 0, parts: [...untouched, part] })
  return { ...doc, samples }
}
export function removeSamplePart(well: InterpretationWell, doc: InterpretationDocument, id: string, part: { segmentId: string; from: number; to: number }) {
  return { ...doc, samples: (doc.samples ?? well.samples).flatMap(s => {
    if (s.id !== id) return [s]
    const parts = s.parts.flatMap(p => {
      if (p.segmentId !== part.segmentId || p.to <= part.from || p.from >= part.to) return [p]
      const pieces = []
      if (p.from < part.from) pieces.push({ ...p, to: part.from })
      if (p.to > part.to) pieces.push({ ...p, from: part.to })
      return pieces
    })
    return parts.length ? [{ ...s, parts }] : []
  }) }
}
