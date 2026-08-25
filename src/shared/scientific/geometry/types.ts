export type AxisUnit = 'm' | 'degree' | 'unknown'
export type CrsKind = 'projected' | 'geographic' | 'local' | 'unknown'

export type CrsDefinition = {
  id: string
  authority: 'EPSG' | 'LOCAL'
  code: string
  name: string
  kind: CrsKind
  axisOrder: 'xy'
  unit: AxisUnit
  coordinateBounds?: { minX: number; minY: number; maxX: number; maxY: number }
}

export type Position2D = [x: number, y: number]
export type Position3D = [x: number, y: number, z: number]
export type Position = Position2D | Position3D

type SpatialGeometryBase = {
  crs: CrsDefinition
}

export type SpatialPoint<P extends Position = Position> = SpatialGeometryBase & {
  type: 'Point'
  coordinates: P
}

export type SpatialLineString<P extends Position = Position> = SpatialGeometryBase & {
  type: 'LineString'
  coordinates: P[]
}

export type SpatialPolygon<P extends Position = Position> = SpatialGeometryBase & {
  type: 'Polygon'
  coordinates: P[][]
}

export type SpatialGeometry = SpatialPoint | SpatialLineString | SpatialPolygon

export type GeometryBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  minZ?: number
  maxZ?: number
  crs: CrsDefinition
}

export type GeometryIssueCode =
  | 'INVALID_CRS'
  | 'CRS_METADATA_UNKNOWN'
  | 'NON_FINITE_COORDINATE'
  | 'GEOGRAPHIC_COORDINATE_OUT_OF_RANGE'
  | 'PROJECTED_COORDINATE_OUT_OF_RANGE'
  | 'DIMENSION_MISMATCH'
  | 'LINE_TOO_SHORT'
  | 'RING_TOO_SHORT'
  | 'RING_NOT_CLOSED'
  | 'DUPLICATE_CONSECUTIVE_POSITION'
  | 'DEGENERATE_RING'
  | 'SELF_INTERSECTION'
  | 'HOLE_OUTSIDE_SHELL'
  | 'RING_INTERSECTION'
  | 'POSITION_LIMIT_EXCEEDED'
  | 'INVALID_SERIALIZED_GEOMETRY'
  | 'CRS_TRANSFORM_UNAVAILABLE'

export type GeometryIssue = {
  code: GeometryIssueCode
  severity: 'error' | 'warning'
  message: string
  path?: string
}

export type SpatialGeometryDocument = {
  schema: 'kapgeo.geometry'
  schemaVersion: 1
  crs: CrsDefinition
  geometry: {
    type: SpatialGeometry['type']
    coordinates: Position | Position[] | Position[][]
  }
}

export type GeometryTransformAdapter = {
  id: string
  transformPosition: (position: Position, source: CrsDefinition, target: CrsDefinition) => Position
}

export class GeometryError extends Error {
  constructor(
    public readonly code: GeometryIssueCode,
    message: string,
    public readonly issues: GeometryIssue[] = [],
  ) {
    super(message)
    this.name = 'GeometryError'
  }
}
