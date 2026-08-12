import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Crosshair, MapPinned, Ruler, Waypoints } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchWells } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

type Horizon = { code: string; name: string; color: string; top: number; base: number }

const horizons: Horizon[] = [
  { code: 'K2', name: 'Покрышка', color: '#d9b77a', top: 0, base: 164 },
  { code: 'J3', name: 'Продуктивный горизонт A', color: '#5fa893', top: 164, base: 284 },
  { code: 'J2', name: 'Продуктивный горизонт B', color: '#557ebd', top: 284, base: 408 },
  { code: 'J1', name: 'Опорный горизонт', color: '#8b75bb', top: 408, base: 520 },
]

const sectionWells = ['WELL-1010-FULL', 'WELL-1042', 'WELL-1038']

export function GeologyCorrelationPage() {
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const [selectedWellId, setSelectedWellId] = useState('WELL-1010-FULL')
  const [datum, setDatum] = useState<'depth' | 'horizon'>('horizon')
  const wells = useMemo(() => sectionWells.map((id) => wellsQuery.data?.find((well) => well.id === id)).filter(Boolean), [wellsQuery.data])
  const selectedWell = wells.find((well) => well?.id === selectedWellId)

  return <div className="page-stack">
    <PageHeader eyebrow="Геологический модуль · GEO-20" title="Разрез и корреляция" description="Рабочая схема профиля PR-07: сопоставляйте горизонты, фиксируйте опорную скважину и сразу переходите к первичным данным." meta={<Badge tone="success" dot>Профиль PR-07 · 3 скважины</Badge>} actions={<Link to="/geology/map" className="button button--secondary button--md"><MapPinned size={17} />К карте</Link>} />
    <div className="correlation-toolbar"><div className="segmented-control" aria-label="Привязка разреза"><button type="button" className={datum === 'horizon' ? 'is-active' : ''} onClick={() => setDatum('horizon')}>По горизонтам</button><button type="button" className={datum === 'depth' ? 'is-active' : ''} onClick={() => setDatum('depth')}>По глубине</button></div><div className="correlation-toolbar__meta"><Waypoints size={16} /> Линия профиля: 328 м <span>·</span> Масштаб 1:2 000</div></div>
    <div className="correlation-layout">
      <Panel className="correlation-layout__section" title="Корреляционный разрез A–A′" description={datum === 'horizon' ? 'Верх продуктивного горизонта A принят за датум.' : 'Истинная вертикальная глубина, м.'}>
        <div className={`correlation-section correlation-section--${datum}`}><div className="correlation-scale" aria-hidden="true"><span>0</span><span>150</span><span>300</span><span>450</span><span>600 м</span></div><div className="correlation-wells">{wells.map((well, index) => well && <button key={well.id} type="button" onClick={() => setSelectedWellId(well.id)} className={`correlation-well ${selectedWellId === well.id ? 'is-selected' : ''}`}><span className="correlation-well__head"><Crosshair size={15} />{well.code}</span><span className="correlation-well__depth">{well.depth.toLocaleString('ru-RU')} м</span><span className="correlation-well__column" style={{ '--offset': `${datum === 'horizon' ? index * 5 : 0}px` } as React.CSSProperties}>{horizons.map((horizon) => <span key={horizon.code} title={`${horizon.name}: ${horizon.top}–${horizon.base} м`} style={{ backgroundColor: horizon.color, height: `${(horizon.base - horizon.top) / 2.5}px` }} />)}</span></button>)}</div><svg className="correlation-section__ties" viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true">{[82, 132, 182, 228].map((y) => <path key={y} d={`M 80 ${y} C 220 ${y - 9}, 390 ${y + 12}, 525 ${y + 3}`} />)}</svg></div>
        <div className="correlation-legend">{horizons.map((horizon) => <span key={horizon.code}><i style={{ backgroundColor: horizon.color }} />{horizon.code} · {horizon.name}</span>)}</div>
      </Panel>
      <aside className="correlation-aside"><Panel title="Опорная скважина" description="Выбранный объект для сверки">{selectedWell ? <div className="correlation-inspector"><strong>{selectedWell.code}</strong><span>{selectedWell.site} · {selectedWell.block}</span><dl><div><dt>Глубина</dt><dd>{selectedWell.depth} м</dd></div><div><dt>Полнота</dt><dd>{selectedWell.completeness}%</dd></div><div><dt>Качество</dt><dd>{selectedWell.quality}</dd></div></dl><Link to="/objects/wells/$wellId" params={{ wellId: selectedWell.id }} search={{ tab: 'lithology' }} className="button button--primary button--md">Открыть колонку</Link></div> : <span className="muted">Загрузка скважин…</span>}</Panel><Panel title="Контроль корреляции" description="Проверки по выбранному профилю"><div className="correlation-checks"><div><Badge tone="success">Совпадает</Badge><span>Горизонт A прослежен по всем скважинам.</span></div><div><Badge tone="warning">Проверить</Badge><span>В WELL-1042 кровля B смещена на 3,2 м.</span></div><div><Badge tone="ai">AI-подсказка</Badge><span>Вероятный сброс между WELL-1042 и WELL-1038.</span></div></div></Panel><Panel title="Что дальше" description="Решение по разрезу"><div className="correlation-next"><Ruler size={20} /><span>После экспертного подтверждения профиль передаётся в проект подсчёта запасов.</span></div></Panel></aside>
    </div>
  </div>
}
