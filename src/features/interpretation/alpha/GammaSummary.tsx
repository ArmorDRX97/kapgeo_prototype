import { useState } from 'react'
import type { AlphaDocument } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import { gammaCurve } from '../../../entities/interpretation/lib/alphaGamma'
import { oreCategoryNames, oreTotals, stocksByLft, totalsByCategory, zadrSummary, zoneSummary } from '../../../entities/interpretation/lib/alphaGammaReports'
import { Button } from '../../../shared/ui/Button'
import { Group } from './Fields'
import { saveBlob, tableCsv } from './export'

type Column = [key: string, label: string]
const oreColumns: Column[] = [['category', 'Категория'], ['count', 'Интервалов'], ['thickness', 'm, м'], ['ra', 'Ra ср., %'], ['raMetro', 'mRa, м·%'], ['uranium', 'U ср., %'], ['metro', 'mc, м·%'], ['linearStock', 'Запас U, кг/м²']]
const zoneColumns: Column[] = [['name', 'Область'], ['from', 'От, м'], ['to', 'До, м'], ['length', 'Длина, м'], ['ore', 'Руда, м'], ['uranium', 'U ср., %'], ['metro', 'mc, м·%'], ['linearStock', 'Запас U, кг/м²'], ['kf', 'Кф ср., м/сут'], ['coverage', 'Доля руды'], ['dilution', 'Доля безрудного']]
const lftColumns: Column[] = [['lft', 'ЛФТ'], ['thickness', 'Руда, м'], ['uranium', 'U ср., %'], ['metro', 'mc, м·%'], ['kf', 'Кф ср., м/сут'], ['linearStock', 'Запас U, кг/м²']]
export function GammaSummary({ well, doc, disabled }: { well: InterpretationWell; doc: AlphaDocument; disabled: boolean }) {
  const categories = totalsByCategory(doc).map(r => ({ ...r, category: oreCategoryNames[r.category] })), overall = { category: 'Всего', ...oreTotals(doc.gamma.rows, doc.parameters.gamma.density) }
  const lft = stocksByLft(doc).map(r => ({ ...r, lft: r.lft < 0 ? 'Нет литологии' : String(r.lft) }))
  const actual = doc.current.rows.find(r => r.id === 'actual-filter'), zone = zadrSummary(doc, well.depth)
  const zones = [{ name: 'Предложение фильтра', ...zoneSummary(doc, doc.filterProposal) }, ...(actual ? [{ name: 'Фактический фильтр ТК', ...zoneSummary(doc, actual) }] : []), ...(zone ? [{ name: 'ЗАДР', ...zone }] : [])]
  const [error, setError] = useState('')
  const download = (headers: string[], rows: unknown[][], suffix: string) => saveBlob(new Blob([tableCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }), `${well.code}-${suffix}.csv`)
  const exportTable = (rows: object[], columns: Column[], suffix: string) => download(columns.map(c => c[1]), rows.map(row => columns.map(([key]) => (row as Record<string, unknown>)[key])), suffix)
  const exportPoints = () => {
    try {
      const corrected = gammaCurve(well, doc), original = allAlphaRecords(well, doc).find(r => r.id === doc.parameters.gamma.recordId)!, p = doc.parameters.gamma
      const rows = corrected.depths.flatMap((depth, i) => { if (depth < p.from || depth > p.to) return []; const ore = doc.gamma.rows.find(r => depth >= r.from && depth <= r.to), ra = corrected.values[i]; return [[depth, original.values[i], ra, ore && ra !== null ? ra! / ore.krr : null, ore?.id ?? '', ore?.category ?? '']] })
      download(['Глубина, м', 'Исходная ГК, мкР/ч', 'Расчётный Ra, %', 'U внутри руды, %', 'Рудный интервал', 'Категория'], rows, 'gamma-points'); setError('')
    } catch (e) { setError((e as Error).message) }
  }
  return <Group title="Сводные результаты ГК">
    <SummaryTable caption="Итог Ra / U по кондициям" rows={[...categories, overall]} columns={oreColumns} />
    <div className="alpha-actions"><Button size="sm" variant="secondary" disabled={disabled} onClick={() => exportTable([...categories, overall], oreColumns, 'gamma-categories')}>Кондиции CSV</Button><Button size="sm" variant="secondary" disabled={disabled} onClick={exportPoints}>Исходные и расчётные точки CSV</Button></div>
    <SummaryTable caption="Запасы по литолого-фильтрационным типам" rows={lft} columns={lftColumns} />
    <Button size="sm" variant="secondary" disabled={disabled} onClick={() => exportTable(lft, lftColumns, 'gamma-lft')}>ЛФТ CSV</Button>
    <SummaryTable caption="Предложение / факт фильтра и ЗАДР" rows={zones} columns={zoneColumns} />
    <Button size="sm" variant="secondary" disabled={disabled} onClick={() => exportTable(zones, zoneColumns, 'gamma-filter-zadr')}>Фильтр и ЗАДР CSV</Button>
    <p>Запас U = mc × сухая плотность × 10, кг/м². Средние содержания взвешены по мощности. Доля руды ограничена 0…1; доля безрудного = 1 − доля руды. Для фильтра и ЗАДР применён выбранный состав кондиций. Неполное покрытие литологией не подменяется породой.</p>
    {error && <p role="alert">{error}</p>}
  </Group>
}
function SummaryTable({ caption, rows, columns }: { caption: string; rows: object[]; columns: Column[] }) {
  const format = (value: unknown) => value === null || value === undefined ? '—' : typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 5 }).format(value) : String(value)
  return <div className="alpha-table"><table><caption>{caption}</caption><thead><tr>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map(([key]) => <td key={key}>{format((row as Record<string, unknown>)[key])}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="alpha-empty">Нет данных для сводки.</p>}</div>
}
