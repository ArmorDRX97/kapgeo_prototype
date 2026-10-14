import type { AlphaHeader } from './alphaTypes'
export const alphaDepositNames = { 'demo-north': 'Северный · автономный пример', 'demo-east': 'Восточный · автономный пример' }
export const alphaWellKindNames = { exploration: 'Разведочная', production: 'Откачная', injection: 'Закачная', observation: 'Наблюдательная' }
export const defaultAlphaHeader = (): AlphaHeader => ({ deposit: 'demo-north', horizon: 'Условный горизонт 1', block: 'Демо-01', row: 'А', kind: 'exploration', organization: 'Демонстрационная геологическая служба', loggedAt: '2026-10-08' })
