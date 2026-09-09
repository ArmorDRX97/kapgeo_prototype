import type { CoreMeasurement, CoreRun, CoreSample } from '../model/types'
import { coreRunLength } from '../model/types'

const overlaps = (fromA: number, toA: number, fromB: number, toB: number) => fromA < toB && toA > fromB

export function validateCoreRun(run: CoreRun, runs: CoreRun[], wellDepth: number) {
  const errors: string[] = []
  if (!run.number.trim()) errors.push('Укажите номер рейса.')
  if (runs.some((item) => item.id !== run.id && item.number.trim().toLocaleLowerCase() === run.number.trim().toLocaleLowerCase())) errors.push(`Рейс «${run.number.trim()}» уже существует в этой скважине.`)
  if (!(run.depthFrom >= 0) || !(run.depthTo > run.depthFrom)) errors.push('Глубина «до» должна быть больше глубины «от».')
  if (run.depthTo > wellDepth) errors.push(`Глубина рейса не может превышать глубину скважины ${wellDepth} м.`)
  const conflict = runs.find((item) => item.id !== run.id && overlaps(run.depthFrom, run.depthTo, item.depthFrom, item.depthTo))
  if (conflict) errors.push(`Интервал пересекается с рейсом «${conflict.number}» (${conflict.depthFrom}–${conflict.depthTo} м).`)
  if (run.recoveredLength < 0 || run.recoveredLength > coreRunLength(run)) errors.push('Выход керна должен быть от 0 до длины рейса.')
  return errors
}

export function validateCoreMeasurement(measurement: CoreMeasurement, run: CoreRun) {
  const errors: string[] = []
  if (!measurement.intervals.length) errors.push('Добавьте хотя бы один интервал промера.')
  measurement.intervals.forEach((interval, index) => {
    const label = `Интервал ${index + 1}`
    if (!(interval.depthTo > interval.depthFrom)) errors.push(`${label}: глубина «до» должна быть больше глубины «от».`)
    if (interval.depthFrom < run.depthFrom || interval.depthTo > run.depthTo) errors.push(`${label}: глубины должны находиться в границах рейса ${run.depthFrom}–${run.depthTo} м.`)
    if (interval.doseRate !== null && interval.doseRate < 0) errors.push(`${label}: мощность дозы не может быть отрицательной.`)
  })
  return errors
}

export function validateCoreSample(sample: CoreSample, samples: CoreSample[], runs: CoreRun[]) {
  const errors: string[] = []
  if (!sample.number.trim()) errors.push('Укажите номер пробы.')
  if (samples.some((item) => item.id !== sample.id && item.sampleType === sample.sampleType && item.number.trim().toLocaleLowerCase() === sample.number.trim().toLocaleLowerCase())) errors.push(`Проба «${sample.number.trim()}» этого вида уже существует.`)
  if (!sample.intervals.length) errors.push('Добавьте хотя бы один интервал отбора.')
  sample.intervals.forEach((interval, index) => {
    const label = `Интервал ${index + 1}`
    const run = runs.find((item) => item.id === interval.runId)
    if (!run) return errors.push(`${label}: выберите керновый рейс.`)
    if (!(interval.drillDepthTo > interval.drillDepthFrom)) errors.push(`${label}: глубина по бурению «до» должна быть больше глубины «от».`)
    if (interval.drillDepthFrom < run.depthFrom || interval.drillDepthTo > run.depthTo) errors.push(`${label}: глубины по бурению должны находиться в границах рейса ${run.number}.`)
    const adjustedIsPartial = (interval.adjustedDepthFrom === null) !== (interval.adjustedDepthTo === null)
    if (adjustedIsPartial || (interval.adjustedDepthFrom !== null && interval.adjustedDepthTo !== null && interval.adjustedDepthTo <= interval.adjustedDepthFrom)) errors.push(`${label}: скорректированные глубины заполните парой, где «до» больше «от».`)
  })
  sample.results.forEach((result, index) => {
    if (!result.analyte.trim()) errors.push(`Результат ${index + 1}: выберите показатель.`)
  })
  return errors
}
