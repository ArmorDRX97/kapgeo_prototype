import type { AlphaHeader } from './alphaTypes'
export const alphaDepositNames = { 'demo-north': 'Северный участок', 'demo-east': 'Восточный участок' }
export const alphaWellKindNames = { exploration: 'Разведочная', production: 'Откачная', injection: 'Закачная', observation: 'Наблюдательная' }
export const defaultAlphaHeader = (): AlphaHeader => ({ deposit: 'demo-north', horizon: 'Горизонт 1', block: 'БЛ-01', row: 'А', kind: 'exploration', organization: 'Геологическая служба Северного участка', loggedAt: '2026-10-08' })
