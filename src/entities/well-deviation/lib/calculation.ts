import type { DeviationPoint, DeviationSurvey } from '../model/types'

export type DeviationCalculationInput = Pick<DeviationSurvey, 'correctionAngle' | 'minZenithAngle'> & {
  points: Array<Pick<DeviationPoint, 'id' | 'depth' | 'azimuth' | 'zenithAngle'>>
}

const round = (value: number) => Number(value.toFixed(3))
const radians = (degrees: number) => degrees * Math.PI / 180
const degrees = (value: number) => value * 180 / Math.PI
const normalizeAngle = (value: number) => ((value % 360) + 360) % 360

function averageBearing(left: number, right: number) {
  const delta = ((right - left + 540) % 360) - 180
  return normalizeAngle(left + delta / 2)
}

export function calculateDeviationSurvey(input: DeviationCalculationInput): Pick<DeviationSurvey, 'points' | 'planDistance' | 'zenithTopBottom' | 'bearingTopBottom'> {
  const ordered = [...input.points].sort((left, right) => left.depth - right.depth)
  let totalX = 0
  let totalY = 0
  let totalZ = 0

  const points = ordered.map((point, index): DeviationPoint => {
    const previous = ordered[index - 1]
    const interval = point.depth - (previous?.depth ?? 0)
    const pointZenith = point.zenithAngle < input.minZenithAngle ? 0 : point.zenithAngle
    const previousZenith = previous
      ? (previous.zenithAngle < input.minZenithAngle ? 0 : previous.zenithAngle)
      : 0
    const pointBearing = normalizeAngle(point.azimuth + input.correctionAngle)
    const previousBearing = previous
      ? normalizeAngle(previous.azimuth + input.correctionAngle)
      : pointBearing
    const meanZenith = radians((previousZenith + pointZenith) / 2)
    const meanBearing = radians(averageBearing(previousBearing, pointBearing))
    const dx = interval * Math.sin(meanZenith) * Math.cos(meanBearing)
    const dy = interval * Math.sin(meanZenith) * Math.sin(meanBearing)
    const dz = interval * Math.cos(meanZenith)
    totalX += dx
    totalY += dy
    totalZ += dz
    return { ...point, dx: round(dx), dy: round(dy), dz: round(dz) }
  })

  const planDistance = Math.hypot(totalX, totalY)
  return {
    points,
    planDistance: round(planDistance),
    zenithTopBottom: round(degrees(Math.atan2(planDistance, totalZ))),
    bearingTopBottom: planDistance === 0 ? 0 : round(normalizeAngle(degrees(Math.atan2(totalY, totalX)))),
  }
}

