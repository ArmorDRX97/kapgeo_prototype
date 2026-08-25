import { resetLabResults } from '../data/labResults'
import { resetGeologyData } from '../data/wellGeology'
import { resetSamples } from '../data/wellSamples'
import { resetTechnicalData } from '../data/wellTechnical'
import { getSeedWells, wells } from '../data/wells'
import { demoDatabase } from './demoDatabase'
import { demoScientificJobRepository } from './scientificJobRepository'
import { demoWellPassportRepository } from './wellPassportRepository'

/** Restores the deterministic local synthetic world. It never calls a server. */
export async function resetDemoData(): Promise<void> {
  await demoDatabase.reset()
  wells.splice(0, wells.length, ...getSeedWells())
  resetTechnicalData()
  resetGeologyData()
  resetSamples()
  resetLabResults()
  await demoWellPassportRepository.reset()
  demoScientificJobRepository.reset()
}
