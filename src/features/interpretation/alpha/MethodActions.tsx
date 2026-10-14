import { useState } from 'react'
import type { AlphaDocument, AlphaPage } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { regenerateSections, setPaleozoic } from '../../../entities/interpretation/lib/alphaCommands'
import { proposeFilter } from '../../../entities/interpretation/lib/alphaGammaReports'
import { alphaStale } from '../../../entities/interpretation/lib/alphaCalculations'
import { Button } from '../../../shared/ui/Button'
import { NumberField } from './Fields'

export function MethodActions({ page, well, doc, onChange, disabled }: { page: AlphaPage; well: InterpretationWell; doc: AlphaDocument; onChange: (next: AlphaDocument) => void; disabled: boolean }) {
  const [depth, setDepth] = useState(140), [count, setCount] = useState(3), [error, setError] = useState(''), [length, setLength] = useState(doc.filterProposal.to - doc.filterProposal.from)
  const run = (fn: () => AlphaDocument) => { try { onChange(fn()); setError('') } catch (e) { setError((e as Error).message) } }
  if (page === 'gamma') return <fieldset disabled={disabled} className="alpha-parameters"><details className="alpha-group"><summary>Предлагаемая посадка фильтра</summary><div><NumberField label="Длина предлагаемого фильтра, м" value={length} onChange={setLength} /><p>Максимизируется доля выбранной руды в фильтре; при равном охвате — mc, затем близость к текущему предложению. Фактическая посадка ТК не меняется.</p><Button size="sm" variant="secondary" onClick={() => run(() => { if (alphaStale(well, doc, 'gamma')) throw new Error('Сначала примените актуальный результат ГК.'); return { ...doc, filterProposal: proposeFilter(doc, length, well.depth) } })}>Предложить посадку</Button></div></details>{error && <p role="alert">{error}</p>}</fieldset>
  if (page !== 'electro' && page !== 'flow') return null
  return <fieldset disabled={disabled} className="alpha-parameters"><details className="alpha-group"><summary>{page === 'electro' ? 'Отбить палеозой' : 'Секции фактического фильтра'}</summary><div>
    {page === 'electro' ? <><NumberField label="Кровля палеозоя, м" value={depth} onChange={setDepth} /><p>Контакты ниже этой глубины заменяются одним интервалом «Палеозой» до забоя, Кф = 0. Действие можно отменить.</p><Button size="sm" variant="secondary" onClick={() => run(() => setPaleozoic(well, doc, depth))}>Назначить палеозой</Button></> : <><NumberField label="Количество секций фильтра" step={1} value={count} onChange={setCount} /><p>Разделить весь фактический фильтр на равные секции. Ручные контакты будут заменены; Undo восстанавливает прежние.</p><Button size="sm" variant="secondary" onClick={() => run(() => regenerateSections(doc, count))}>Пересоздать секции</Button></>}
  </div></details>{error && <p role="alert">{error}</p>}</fieldset>
}
