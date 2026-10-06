import { ChevronRight } from 'lucide-react'
import type { CoreSegment, InterpretationDocument, InterpretationMode, InterpretationWell, LithologyInterval, TechnologyInterval } from '../../../entities/interpretation/model/types'
import { meanResistivity } from '../../../entities/interpretation/lib/calculation'
import { derivedRuns, isNoCore, mappedSamples } from '../../../entities/interpretation/lib/core'
import { interpretationCopy as copy } from '../model/copy'
import type { Selection } from '../model/tracks'

export function ResultsTable({ mode, rows, samples, selected, well, document, preview, open, onToggle, onSelect, trackId }:
  { mode: InterpretationMode; rows: (CoreSegment | LithologyInterval | TechnologyInterval)[]; samples: ReturnType<typeof mappedSamples>; selected: Selection;
    well: InterpretationWell; document: InterpretationDocument; preview: boolean; open: boolean; onToggle: () => void; onSelect: (track: string, id: string) => void; trackId: string }) {
  return <section className="interpretation-table-section">
    <button type="button" className="interpretation-table-toggle" aria-expanded={open} onClick={onToggle}><span>{mode === 'core' ? 'Керновые сегменты и связанные пробы' : preview ? 'Интервалы предпросмотра' : 'Реестр интервалов'} <em>{rows.length}</em></span><ChevronRight size={16} className={open ? 'is-open' : ''} /></button>
    {open && <div className="interpretation-table-scroll"><table aria-label="Реестр интервалов"><thead><tr><th>Объект</th><th>От, м</th><th>До, м</th><th>Мощность, м</th><th>{mode === 'core' ? 'Состояние' : 'Тип / порода'}</th>{mode === 'lithology' && <th>Средний КС, Ом·м</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className={selected?.id === row.id ? 'is-selected' : ''}>
      <td><button type="button" onClick={() => onSelect(trackId, row.id)}>{'runId' in row ? `${isNoCore(row) ? 'Без керна' : 'Керн'} ${index + 1}` : `Интервал ${index + 1}`}</button></td><td>{row.from.toFixed(1)}</td><td>{row.to.toFixed(1)}</td><td>{(row.to - row.from).toFixed(1)}</td><td>{'rock' in row ? copy.rocks[row.rock] : !('runId' in row) ? copy.technology[row.kind] : row.to === row.from ? 'Удалён · восстановим' : `${row.reversed ? 'Перевёрнут' : 'Прямая'}${row.properties ? ' · правка' : ''}`}</td>{mode === 'lithology' && <td>{meanResistivity(well, row.from, row.to).mean?.toFixed(2) ?? '—'}</td>}
    </tr>)}</tbody></table>{!rows.length && <p className="interpretation-note">Интервалы отсутствуют.</p>}
    {mode === 'core' && <><table aria-label="Связанные пробы"><thead><tr><th>Проба</th><th>По бурению, м</th><th>Сводная глубина, м</th><th>Лаборатория, %</th></tr></thead><tbody>{samples.map((s, i) => <tr key={s.id} className={selected?.id === s.id || selected?.id === s.segmentId ? 'is-selected' : ''}><td><button type="button" aria-label={`Выбрать ${s.name}, часть ${samples.slice(0, i + 1).filter(part => part.sampleId === s.sampleId).length}`} onClick={() => onSelect('sample', s.id)}>{s.name}</button></td><td>{s.sourceFrom.toFixed(1)}—{s.sourceTo.toFixed(1)}</td><td>{s.from.toFixed(1)}—{s.to.toFixed(1)}</td><td>{s.assay.toFixed(3)}</td></tr>)}</tbody></table>{!samples.length && <p className="interpretation-note">Видимых проб этого вида нет. Пробы удалённых сегментов сохраняются вместе с исходными данными.</p>}
    <table aria-label="Сводные рейсы"><thead><tr><th>Рейс по бурению</th><th>Сводный диапазон, м</th><th>Выход, м</th><th>Выход, %</th></tr></thead><tbody>{derivedRuns(well, document).map(r => <tr key={r.id}><td>{well.runs.find(x => x.id === r.id)!.from}—{well.runs.find(x => x.id === r.id)!.to}</td><td>{r.from.toFixed(1)}—{r.to.toFixed(1)}</td><td>{r.recovered.toFixed(1)}</td><td>{r.percent.toFixed(1)}</td></tr>)}</tbody></table></>}
    </div>}
  </section>
}
