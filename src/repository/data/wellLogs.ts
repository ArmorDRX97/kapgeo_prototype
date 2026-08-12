import type { LogRun } from '../../entities/well/model/types'
const base: LogRun[] = [
  { id: 'LOG-1042-0418', wellId: 'WELL-1042', name: 'ГК+ПС · апрель 2026', from: 0, to: 612.4, depthUnit: 'м', step: .2, curves: ['GR', 'SP', 'RES'], source: 'LAS', status: 'Есть замечания QC', qcIssues: 2, importedAt: '18 апр 2026' },
  { id: 'LOG-1042-0322', wellId: 'WELL-1042', name: 'Контрольный каротаж', from: 118, to: 608, depthUnit: 'м', step: .5, curves: ['GR', 'RES'], source: 'DAT', status: 'QC пройден', qcIssues: 0, importedAt: '22 мар 2026' },
]
export function getWellLogs(wellId: string) { return ['WELL-1042', 'WELL-1010-FULL'].includes(wellId) ? base.map((item) => ({ ...item, id: wellId === 'WELL-1010-FULL' ? item.id.replace('1042', '1010') : item.id, wellId, curves: [...item.curves] })) : [] }
