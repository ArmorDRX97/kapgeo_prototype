import { sameCrs } from './crs'
import {
  GeometryError,
  type CrsDefinition,
  type GeometryBounds,
  type GeometryIssue,
  type GeometryTransformAdapter,
  type Position,
  type SpatialGeometry,
  type SpatialGeometryDocument,
  type SpatialLineString,
  type SpatialPoint,
  type SpatialPolygon,
} from './types'

const DEFAULT_POSITION_LIMIT = 100_000
const EPSILON = 1e-9

const clonePosition = <P extends Position>(position: P): P => [...position] as P
const cloneCrs = (crs: CrsDefinition): CrsDefinition => ({
  id: crs.id,
  authority: crs.authority,
  code: crs.code,
  name: crs.name,
  kind: crs.kind,
  axisOrder: crs.axisOrder,
  unit: crs.unit,
  ...(crs.coordinateBounds ? { coordinateBounds: { ...crs.coordinateBounds } } : {}),
})

export function createPoint<P extends Position>(coordinates: P, crs: CrsDefinition): SpatialPoint<P> {
  return { type: 'Point', coordinates: clonePosition(coordinates), crs: cloneCrs(crs) }
}

export function createLineString<P extends Position>(coordinates: P[], crs: CrsDefinition): SpatialLineString<P> {
  return { type: 'LineString', coordinates: coordinates.map(clonePosition), crs: cloneCrs(crs) }
}

export function createPolygon<P extends Position>(coordinates: P[][], crs: CrsDefinition): SpatialPolygon<P> {
  return { type: 'Polygon', coordinates: coordinates.map((ring) => ring.map(clonePosition)), crs: cloneCrs(crs) }
}

export function closeRing<P extends Position>(ring: P[]): P[] {
  if (ring.length === 0) return []
  const result = ring.map(clonePosition)
  if (!positionsEqual(result[0]!, result.at(-1)!)) result.push(clonePosition(result[0]!))
  return result
}

export function cloneGeometry<T extends SpatialGeometry>(geometry: T): T {
  if (geometry.type === 'Point') return createPoint(geometry.coordinates, geometry.crs) as T
  if (geometry.type === 'LineString') return createLineString(geometry.coordinates, geometry.crs) as T
  return createPolygon(geometry.coordinates, geometry.crs) as T
}

export function validateGeometry(geometry: SpatialGeometry, positionLimit = DEFAULT_POSITION_LIMIT): GeometryIssue[] {
  const issues: GeometryIssue[] = []
  validateCrs(geometry.crs, issues)
  const positions = collectPositions(geometry)

  if (positions.length > positionLimit) {
    issues.push({ code: 'POSITION_LIMIT_EXCEEDED', severity: 'error', message: `Геометрия содержит ${positions.length} точек; допустимо не более ${positionLimit}.` })
  }

  const expectedDimension = positions[0]?.length
  positions.forEach((position, index) => {
    if (position.length !== 2 && position.length !== 3) {
      issues.push({ code: 'DIMENSION_MISMATCH', severity: 'error', path: `coordinates[${index}]`, message: 'Позиция должна содержать две или три координаты.' })
    }
    if (expectedDimension !== undefined && position.length !== expectedDimension) {
      issues.push({ code: 'DIMENSION_MISMATCH', severity: 'error', path: `coordinates[${index}]`, message: 'Все координаты геометрии должны иметь одинаковую размерность.' })
    }
    position.forEach((value, axis) => {
      if (!Number.isFinite(value)) {
        issues.push({ code: 'NON_FINITE_COORDINATE', severity: 'error', path: `coordinates[${index}][${axis}]`, message: 'Координата должна быть конечным числом.' })
      }
    })
    const bounds = geometry.crs.coordinateBounds
    if (bounds && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      if (position[0] < bounds.minX || position[0] > bounds.maxX || position[1] < bounds.minY || position[1] > bounds.maxY) {
        issues.push({
          code: geometry.crs.kind === 'geographic' ? 'GEOGRAPHIC_COORDINATE_OUT_OF_RANGE' : 'PROJECTED_COORDINATE_OUT_OF_RANGE',
          severity: 'error',
          path: `coordinates[${index}]`,
          message: `Координата находится вне допустимого диапазона ${geometry.crs.id}.`,
        })
      }
    }
  })

  if (geometry.type === 'LineString') validateLine(geometry.coordinates, issues)
  if (geometry.type === 'Polygon') validatePolygon(geometry.coordinates, issues)
  return deduplicateIssues(issues)
}

export function assertValidGeometry<T extends SpatialGeometry>(geometry: T): T {
  const issues = validateGeometry(geometry)
  const errors = issues.filter((issue) => issue.severity === 'error')
  if (errors.length > 0) throw new GeometryError(errors[0]!.code, errors[0]!.message, issues)
  return geometry
}

export function geometryBounds(geometry: SpatialGeometry): GeometryBounds {
  assertValidGeometry(geometry)
  const positions = collectPositions(geometry)
  const xs = positions.map((position) => position[0])
  const ys = positions.map((position) => position[1])
  const zs = positions.flatMap((position) => position.length === 3 ? [position[2]] : [])
  return {
    minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys),
    ...(zs.length > 0 ? { minZ: Math.min(...zs), maxZ: Math.max(...zs) } : {}),
    crs: cloneCrs(geometry.crs),
  }
}

export function geometryLength(line: SpatialLineString): number {
  assertMetricCrs(line.crs)
  assertValidGeometry(line)
  return line.coordinates.slice(1).reduce((total, position, index) => total + distance(line.coordinates[index]!, position), 0)
}

export function polygonArea(polygon: SpatialPolygon): number {
  assertMetricCrs(polygon.crs)
  assertValidGeometry(polygon)
  const [shell, ...holes] = polygon.coordinates
  return Math.abs(signedRingArea(shell!)) - holes.reduce((total, ring) => total + Math.abs(signedRingArea(ring)), 0)
}

export function serializeGeometry(geometry: SpatialGeometry): string {
  assertValidGeometry(geometry)
  return JSON.stringify(toGeometryDocument(geometry))
}

export function toGeometryDocument(geometry: SpatialGeometry): SpatialGeometryDocument {
  assertValidGeometry(geometry)
  return {
    schema: 'kapgeo.geometry',
    schemaVersion: 1,
    crs: cloneCrs(geometry.crs),
    geometry: geometry.type === 'Point'
      ? { type: geometry.type, coordinates: clonePosition(geometry.coordinates) }
      : geometry.type === 'LineString'
        ? { type: geometry.type, coordinates: geometry.coordinates.map(clonePosition) }
        : { type: geometry.type, coordinates: geometry.coordinates.map((ring) => ring.map(clonePosition)) },
  }
}

export function deserializeGeometry(serialized: string, positionLimit = DEFAULT_POSITION_LIMIT): SpatialGeometry {
  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    throw new GeometryError('INVALID_SERIALIZED_GEOMETRY', 'Геометрия содержит некорректный JSON.')
  }
  if (!isGeometryDocument(value)) {
    throw new GeometryError('INVALID_SERIALIZED_GEOMETRY', 'Документ геометрии не соответствует kapgeo.geometry v1.')
  }
  const geometry = value.geometry.type === 'Point'
    ? createPoint(value.geometry.coordinates as Position, value.crs)
    : value.geometry.type === 'LineString'
      ? createLineString(value.geometry.coordinates as Position[], value.crs)
      : createPolygon(value.geometry.coordinates as Position[][], value.crs)
  const issues = validateGeometry(geometry, positionLimit)
  const errors = issues.filter((issue) => issue.severity === 'error')
  if (errors.length > 0) throw new GeometryError(errors[0]!.code, errors[0]!.message, issues)
  return geometry
}

export function transformGeometry<T extends SpatialGeometry>(geometry: T, target: CrsDefinition, adapter?: GeometryTransformAdapter): T {
  assertValidGeometry(geometry)
  if (sameCrs(geometry.crs, target)) return cloneGeometry(geometry)
  if (!adapter) {
    throw new GeometryError('CRS_TRANSFORM_UNAVAILABLE', `Для преобразования ${geometry.crs.id} → ${target.id} требуется утверждённый CRS adapter.`)
  }
  const transform = (position: Position) => adapter.transformPosition(clonePosition(position), cloneCrs(geometry.crs), cloneCrs(target))
  const transformed = geometry.type === 'Point'
    ? createPoint(transform(geometry.coordinates), target)
    : geometry.type === 'LineString'
      ? createLineString(geometry.coordinates.map(transform), target)
      : createPolygon(geometry.coordinates.map((ring) => ring.map(transform)), target)
  assertValidGeometry(transformed)
  return transformed as T
}

function validateCrs(crs: CrsDefinition, issues: GeometryIssue[]) {
  const authorityValid = crs.authority === 'EPSG' || crs.authority === 'LOCAL'
  const kindValid = crs.kind === 'projected' || crs.kind === 'geographic' || crs.kind === 'local' || crs.kind === 'unknown'
  const unitValid = crs.unit === 'm' || crs.unit === 'degree' || crs.unit === 'unknown'
  const idValid = crs.authority === 'EPSG'
    ? crs.id === `EPSG:${crs.code}` && /^\d+$/.test(crs.code)
    : crs.id === `LOCAL:${crs.code}`
  const bounds = crs.coordinateBounds
  const boundsValid = !bounds || (
    Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY)
    && bounds.minX < bounds.maxX && bounds.minY < bounds.maxY
  )
  if (!crs.id.trim() || !crs.code.trim() || !crs.name.trim() || crs.axisOrder !== 'xy' || !authorityValid || !kindValid || !unitValid || !idValid || !boundsValid) {
    issues.push({ code: 'INVALID_CRS', severity: 'error', path: 'crs', message: 'CRS должна содержать id, code, name и явный порядок осей xy.' })
  }
  if (crs.kind === 'unknown' || crs.unit === 'unknown') {
    issues.push({ code: 'CRS_METADATA_UNKNOWN', severity: 'warning', path: 'crs', message: 'Метаданные CRS неполны; измерения и преобразования недоступны до настройки справочника.' })
  }
}

function validateLine(positions: Position[], issues: GeometryIssue[]) {
  if (positions.length < 2) issues.push({ code: 'LINE_TOO_SHORT', severity: 'error', message: 'Линия должна содержать минимум две точки.' })
  positions.slice(1).forEach((position, index) => {
    if (positionsEqual(position, positions[index]!)) issues.push({ code: 'DUPLICATE_CONSECUTIVE_POSITION', severity: 'error', path: `coordinates[${index + 1}]`, message: 'Соседние точки линии не должны совпадать.' })
  })
}

function validatePolygon(rings: Position[][], issues: GeometryIssue[]) {
  if (rings.length === 0) {
    issues.push({ code: 'RING_TOO_SHORT', severity: 'error', message: 'Полигон должен содержать внешний контур.' })
    return
  }
  rings.forEach((ring, ringIndex) => {
    const path = `coordinates[${ringIndex}]`
    if (ring.length < 4) issues.push({ code: 'RING_TOO_SHORT', severity: 'error', path, message: 'Замкнутый контур должен содержать минимум четыре позиции.' })
    if (ring.length > 0 && !positionsEqual(ring[0]!, ring.at(-1)!)) issues.push({ code: 'RING_NOT_CLOSED', severity: 'error', path, message: 'Первая и последняя позиции контура должны совпадать.' })
    ring.slice(1).forEach((position, index) => {
      if (positionsEqual(position, ring[index]!)) issues.push({ code: 'DUPLICATE_CONSECUTIVE_POSITION', severity: 'error', path: `${path}[${index + 1}]`, message: 'Соседние вершины контура не должны совпадать.' })
    })
    if (ring.length >= 4 && Math.abs(signedRingArea(ring)) <= EPSILON) issues.push({ code: 'DEGENERATE_RING', severity: 'error', path, message: 'Контур имеет нулевую площадь.' })
    if (ring.length >= 4 && hasSelfIntersection(ring)) issues.push({ code: 'SELF_INTERSECTION', severity: 'error', path, message: 'Контур не должен пересекать сам себя.' })
  })

  const shell = rings[0]
  if (!shell || shell.length < 4) return
  rings.slice(1).forEach((hole, index) => {
    if (hole.length >= 4 && (!pointInRing(hole[0]!, shell) || ringsIntersect(hole, shell))) {
      issues.push({ code: 'HOLE_OUTSIDE_SHELL', severity: 'error', path: `coordinates[${index + 1}]`, message: 'Внутренний контур должен находиться внутри внешнего.' })
    }
  })
  const holes = rings.slice(1)
  holes.forEach((hole, first) => {
    holes.slice(first + 1).forEach((other, offset) => {
      if (hole.length >= 4 && other.length >= 4 && (ringsIntersect(hole, other) || pointInRing(hole[0]!, other) || pointInRing(other[0]!, hole))) {
        issues.push({ code: 'RING_INTERSECTION', severity: 'error', path: `coordinates[${first + 1}],coordinates[${first + offset + 2}]`, message: 'Внутренние контуры не должны пересекаться или содержать друг друга.' })
      }
    })
  })
}

function collectPositions(geometry: SpatialGeometry): Position[] {
  if (geometry.type === 'Point') return [geometry.coordinates]
  if (geometry.type === 'LineString') return geometry.coordinates
  return geometry.coordinates.flat()
}

function positionsEqual(left: Position, right: Position): boolean {
  return left.length === right.length && left.every((value, index) => Math.abs(value - right[index]!) <= EPSILON)
}

function distance(left: Position, right: Position): number {
  const dx = right[0] - left[0]
  const dy = right[1] - left[1]
  const dz = left.length === 3 && right.length === 3 ? right[2] - left[2] : 0
  return Math.hypot(dx, dy, dz)
}

function signedRingArea(ring: Position[]): number {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index]!
    const next = ring[index + 1]!
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

function orientation(a: Position, b: Position, c: Position): number {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
  return Math.abs(value) <= EPSILON ? 0 : value > 0 ? 1 : 2
}

function onSegment(a: Position, b: Position, c: Position): boolean {
  return b[0] <= Math.max(a[0], c[0]) + EPSILON && b[0] + EPSILON >= Math.min(a[0], c[0])
    && b[1] <= Math.max(a[1], c[1]) + EPSILON && b[1] + EPSILON >= Math.min(a[1], c[1])
}

function segmentsIntersect(p1: Position, q1: Position, p2: Position, q2: Position): boolean {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)
  if (o1 !== o2 && o3 !== o4) return true
  return (o1 === 0 && onSegment(p1, p2, q1)) || (o2 === 0 && onSegment(p1, q2, q1))
    || (o3 === 0 && onSegment(p2, p1, q2)) || (o4 === 0 && onSegment(p2, q1, q2))
}

function hasSelfIntersection(ring: Position[]): boolean {
  const segmentCount = ring.length - 1
  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      const adjacent = Math.abs(first - second) === 1 || (first === 0 && second === segmentCount - 1)
      if (adjacent) continue
      if (segmentsIntersect(ring[first]!, ring[first + 1]!, ring[second]!, ring[second + 1]!)) return true
    }
  }
  return false
}

function ringsIntersect(left: Position[], right: Position[]): boolean {
  for (let leftIndex = 0; leftIndex < left.length - 1; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length - 1; rightIndex += 1) {
      if (segmentsIntersect(left[leftIndex]!, left[leftIndex + 1]!, right[rightIndex]!, right[rightIndex + 1]!)) return true
    }
  }
  return false
}

function pointInRing(point: Position, ring: Position[]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index]!
    const before = ring[previous]!
    const crosses = (current[1] > point[1]) !== (before[1] > point[1])
      && point[0] < ((before[0] - current[0]) * (point[1] - current[1])) / (before[1] - current[1]) + current[0]
    if (crosses) inside = !inside
  }
  return inside
}

function assertMetricCrs(crs: CrsDefinition) {
  if (crs.unit !== 'm') throw new GeometryError('INVALID_CRS', `Метрика недоступна для CRS ${crs.id} с единицей ${crs.unit}.`)
}

function deduplicateIssues(issues: GeometryIssue[]): GeometryIssue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.path ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isGeometryDocument(value: unknown): value is SpatialGeometryDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as Record<string, unknown>
  if (document.schema !== 'kapgeo.geometry' || document.schemaVersion !== 1 || !document.crs || !document.geometry) return false
  const crs = document.crs as Record<string, unknown>
  const geometry = document.geometry as Record<string, unknown>
  const validType = geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon'
  return validType && hasCoordinateShape(geometry.type as SpatialGeometry['type'], geometry.coordinates)
    && typeof crs.id === 'string' && typeof crs.authority === 'string' && typeof crs.code === 'string'
    && typeof crs.name === 'string' && typeof crs.kind === 'string' && crs.axisOrder === 'xy' && typeof crs.unit === 'string'
}

function hasCoordinateShape(type: SpatialGeometry['type'], coordinates: unknown): boolean {
  const isPosition = (value: unknown): boolean => Array.isArray(value) && value.every((coordinate) => typeof coordinate === 'number')
  if (type === 'Point') return isPosition(coordinates)
  if (!Array.isArray(coordinates)) return false
  if (type === 'LineString') return coordinates.every(isPosition)
  return coordinates.every((ring) => Array.isArray(ring) && ring.every(isPosition))
}
