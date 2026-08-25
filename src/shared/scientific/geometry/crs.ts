import type { CrsDefinition } from './types'

const knownCrs: Record<string, CrsDefinition> = {
  'EPSG:4326': {
    id: 'EPSG:4326', authority: 'EPSG', code: '4326', name: 'WGS 84',
    kind: 'geographic', axisOrder: 'xy', unit: 'degree',
    coordinateBounds: { minX: -180, minY: -90, maxX: 180, maxY: 90 },
  },
  'EPSG:32642': {
    id: 'EPSG:32642', authority: 'EPSG', code: '32642', name: 'WGS 84 / UTM zone 42N',
    kind: 'projected', axisOrder: 'xy', unit: 'm',
    coordinateBounds: { minX: 100_000, minY: 0, maxX: 900_000, maxY: 10_000_000 },
  },
  'LOCAL:SARYTAU': {
    id: 'LOCAL:SARYTAU', authority: 'LOCAL', code: 'SARYTAU', name: 'Локальная Сарытау',
    kind: 'local', axisOrder: 'xy', unit: 'm',
  },
}

const clone = (crs: CrsDefinition): CrsDefinition => ({ ...crs })

export function crsFromId(id: string): CrsDefinition {
  const normalized = id.trim().toUpperCase()
  const known = knownCrs[normalized]
  if (known) return clone(known)

  const epsg = /^EPSG:(\d+)$/.exec(normalized)
  if (epsg) {
    return {
      id: normalized,
      authority: 'EPSG',
      code: epsg[1]!,
      name: normalized,
      kind: 'unknown',
      axisOrder: 'xy',
      unit: 'unknown',
    }
  }

  const local = /^LOCAL:([\p{L}\p{N}._-]+)$/u.exec(normalized)
  if (local) {
    return {
      id: normalized,
      authority: 'LOCAL',
      code: local[1]!,
      name: normalized,
      kind: 'local',
      axisOrder: 'xy',
      unit: 'unknown',
    }
  }

  return {
    id: normalized,
    authority: 'LOCAL',
    code: normalized,
    name: id.trim(),
    kind: 'unknown',
    axisOrder: 'xy',
    unit: 'unknown',
  }
}

export function crsFromLegacy(value: string): CrsDefinition {
  const trimmed = value.trim()
  if (trimmed.toLocaleLowerCase('ru-RU') === 'локальная сарытау') return crsFromId('LOCAL:SARYTAU')
  if (/^EPSG:\d+$/i.test(trimmed)) return crsFromId(trimmed)

  const slug = trimmed
    .normalize('NFKC')
    .toLocaleUpperCase('ru-RU')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return {
    id: `LOCAL:${slug || 'UNSPECIFIED'}`,
    authority: 'LOCAL',
    code: slug || 'UNSPECIFIED',
    name: trimmed || 'Неуказанная локальная СК',
    kind: 'local',
    axisOrder: 'xy',
    unit: 'unknown',
  }
}

export function createLocalCrs(code: string, name: string, unit: CrsDefinition['unit'] = 'm'): CrsDefinition {
  const normalizedCode = code.trim().toUpperCase()
  return {
    id: `LOCAL:${normalizedCode}`,
    authority: 'LOCAL',
    code: normalizedCode,
    name: name.trim(),
    kind: 'local',
    axisOrder: 'xy',
    unit,
  }
}

export function sameCrs(left: CrsDefinition, right: CrsDefinition): boolean {
  return left.id.trim().toUpperCase() === right.id.trim().toUpperCase()
}

export function formatCrs(crs: CrsDefinition): string {
  return crs.authority === 'EPSG' ? crs.id : crs.name
}

export function toLegacyCrs(crs: CrsDefinition): string {
  return formatCrs(crs)
}
