import type { Position2D, SpatialPoint } from '../../../shared/scientific/geometry'

export type WellPurpose = 'Эксплуатационная' | 'Разведочная' | 'Наблюдательная'

export type WellPassportData = {
  purpose: WellPurpose
  profile: string
  location: SpatialPoint<Position2D>
  depth: number
  casingDiameter: number
}
