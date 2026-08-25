import { describe, expect, it } from 'vitest'
import { createLocalCrs, crsFromId, crsFromLegacy, sameCrs } from './crs'
import {
  closeRing,
  createLineString,
  createPoint,
  createPolygon,
  deserializeGeometry,
  geometryBounds,
  geometryLength,
  polygonArea,
  serializeGeometry,
  transformGeometry,
  validateGeometry,
} from './geometry'
import { GeometryError, type GeometryTransformAdapter } from './types'

const utm = crsFromId('EPSG:32642')
const metric = createLocalCrs('TEST', 'Test metric grid')

describe('CRS-aware geometry primitives', () => {
  it('creates independent CRS-aware points and validates geographic ranges', () => {
    const source = [468_146.8, 4_812_856.4] as [number, number]
    const point = createPoint(source, utm)
    source[0] = 0

    expect(point.coordinates).toEqual([468_146.8, 4_812_856.4])
    expect(validateGeometry(point)).toEqual([])
    expect(validateGeometry(createPoint([181, 51], crsFromId('EPSG:4326'))))
      .toContainEqual(expect.objectContaining({ code: 'GEOGRAPHIC_COORDINATE_OUT_OF_RANGE', severity: 'error' }))
    expect(validateGeometry(createPoint([0, 4_812_856], utm)))
      .toContainEqual(expect.objectContaining({ code: 'PROJECTED_COORDINATE_OUT_OF_RANGE', severity: 'error' }))
  })

  it('calculates bounds and metric length for 3D lines', () => {
    const line = createLineString([[0, 0, 0], [3, 4, 12]], metric)

    expect(geometryLength(line)).toBe(13)
    expect(geometryBounds(line)).toMatchObject({ minX: 0, minY: 0, minZ: 0, maxX: 3, maxY: 4, maxZ: 12 })
  })

  it('calculates polygon area with holes without mutating ring orientation', () => {
    const polygon = createPolygon([
      closeRing([[0, 0], [10, 0], [10, 10], [0, 10]]),
      closeRing([[2, 2], [2, 4], [4, 4], [4, 2]]),
    ], metric)

    expect(validateGeometry(polygon)).toEqual([])
    expect(polygonArea(polygon)).toBe(96)
  })

  it('reports unclosed, self-intersecting and outside-hole topology errors', () => {
    const unclosed = createPolygon([[[0, 0], [10, 0], [0, 10], [2, 2]]], metric)
    const bowTie = createPolygon([[[0, 0], [10, 10], [0, 10], [10, 0], [0, 0]]], metric)
    const outsideHole = createPolygon([
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[20, 20], [21, 20], [21, 21], [20, 21], [20, 20]],
    ], metric)

    expect(validateGeometry(unclosed)).toContainEqual(expect.objectContaining({ code: 'RING_NOT_CLOSED' }))
    expect(validateGeometry(bowTie)).toContainEqual(expect.objectContaining({ code: 'SELF_INTERSECTION' }))
    expect(validateGeometry(outsideHole)).toContainEqual(expect.objectContaining({ code: 'HOLE_OUTSIDE_SHELL' }))
  })

  it('round-trips a deterministic versioned serialization envelope', () => {
    const polygon = createPolygon([[[0, 0], [5, 0], [5, 3], [0, 3], [0, 0]]], metric)
    const serialized = serializeGeometry(polygon)
    const restored = deserializeGeometry(serialized)

    expect(serialized).toBe(serializeGeometry(polygon))
    expect(restored).toEqual(polygon)
    expect(() => deserializeGeometry('{bad json')).toThrowError(GeometryError)
    expect(() => deserializeGeometry(JSON.stringify({
      schema: 'kapgeo.geometry', schemaVersion: 1, crs: metric,
      geometry: { type: 'LineString', coordinates: [1, 2] },
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SERIALIZED_GEOMETRY' }))
  })

  it('rejects crossing and nested polygon holes', () => {
    const crossing = createPolygon([
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[8, 8], [12, 8], [12, 12], [8, 12], [8, 8]],
    ], metric)
    const nested = createPolygon([
      [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]],
      [[2, 2], [10, 2], [10, 10], [2, 10], [2, 2]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ], metric)

    expect(validateGeometry(crossing)).toContainEqual(expect.objectContaining({ code: 'HOLE_OUTSIDE_SHELL' }))
    expect(validateGeometry(nested)).toContainEqual(expect.objectContaining({ code: 'RING_INTERSECTION' }))
  })

  it('keeps unknown CRS usable but blocks measurements through explicit metadata warnings', () => {
    const local = crsFromLegacy('Промысловая система 1968')
    const line = createLineString([[0, 0], [1, 1]], local)

    expect(validateGeometry(line)).toContainEqual(expect.objectContaining({ code: 'CRS_METADATA_UNKNOWN', severity: 'warning' }))
    expect(() => geometryLength(line)).toThrow(/Метрика недоступна/)
  })

  it('never reprojects silently and delegates an approved transformation to an adapter', () => {
    const point = createPoint([468_000, 4_812_000], utm)
    const wgs84 = crsFromId('EPSG:4326')
    const adapter: GeometryTransformAdapter = {
      id: 'TEST-ONLY',
      transformPosition: ([x, y], source, target) => {
        expect(source.id).toBe('EPSG:32642')
        expect(target.id).toBe('EPSG:4326')
        expect([x, y]).toEqual([468_000, 4_812_000])
        return [68, 43]
      },
    }

    expect(() => transformGeometry(point, wgs84)).toThrowError(expect.objectContaining({ code: 'CRS_TRANSFORM_UNAVAILABLE' }))
    expect(transformGeometry(point, wgs84, adapter)).toEqual(createPoint([68, 43], wgs84))
    const same = transformGeometry(point, crsFromId('epsg:32642'))
    expect(same).toEqual(point)
    expect(same).not.toBe(point)
    expect(sameCrs(same.crs, point.crs)).toBe(true)
  })

  it('enforces a configurable position limit during validation and deserialization', () => {
    const line = createLineString([[0, 0], [1, 1], [2, 2]], metric)
    const serialized = serializeGeometry(line)

    expect(validateGeometry(line, 2)).toContainEqual(expect.objectContaining({ code: 'POSITION_LIMIT_EXCEEDED' }))
    expect(() => deserializeGeometry(serialized, 2)).toThrowError(expect.objectContaining({ code: 'POSITION_LIMIT_EXCEEDED' }))
  })
})
