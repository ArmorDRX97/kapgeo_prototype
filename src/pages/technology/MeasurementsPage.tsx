import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Save, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const initial = [{ node: 'Насос НС-04', metric: 'Расход раствора', unit: 'м³/ч', value: '1248', required: true }, { node: 'Кислотный узел', metric: 'pH', unit: 'pH', value: '2.8', required: true }, { node: 'WELL-1042', metric: 'Приемистость', unit: 'м³/ч', value: '', required: true }, { node: 'WELL-1038', metric: 'Давление', unit: 'МПа', value: '1.6', required: true }, { node: 'Резервуар R-02', metric: 'Остаток кислоты', unit: 'т', value: '', required: false }]

export function MeasurementsPage() {
  const [rows, setRows] = useState(initial)
  const [closed, setClosed] = useState(false)
  const missing = useMemo(() => rows.filter((row) => row.required && !row.value).length, [rows])
  const setValue = (index: number, value: string) => { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value } : row)); setClosed(false) }
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-06" title="Оперативные замеры смены" description="Пакет S-2026-08-10-02 · источник: ручной ввод диспетчера. Критические значения обязательны для закрытия." meta={<Badge tone={closed ? 'success' : missing ? 'warning' : 'success'} dot>{closed ? 'Пакет закрыт' : missing ? `Не заполнено: ${missing}` : 'Готов к закрытию'}</Badge>} actions={<Link to="/technology" className="button button--secondary button--md">К обзору</Link>} />
    <Panel title="Ввод фактических значений" description="Источник и время фиксируются для каждой строки; изменения сохраняются в рабочей сессии."><div className="measurement-table"><div className="measurement-table__head"><span>Объект</span><span>Показатель</span><span>Факт</span><span>Источник</span><span>Статус</span></div>{rows.map((row, index) => <div className="measurement-table__row" key={row.metric}><span><strong>{row.node}</strong></span><span>{row.metric}<small>{row.unit}</small></span><label><input aria-label={`${row.node} ${row.metric}`} type="number" value={row.value} onChange={(event) => setValue(index, event.target.value)} placeholder="—" /><small>{row.unit}</small></label><span>Ручной · 10:20</span><span>{row.required && !row.value ? <Badge tone="warning">Обязательно</Badge> : <Badge tone="success">Проверено</Badge>}</span></div>)}</div><div className="workspace-savebar"><span>{missing ? <><AlertCircle size={16} />Закрытие заблокировано: заполните обязательные строки.</> : <><CheckCircle2 size={16} />Критические проверки пройдены.</>}</span><div><button className="button button--secondary button--md" type="button"><Save size={16} />Черновик</button><button className="button button--primary button--md" type="button" disabled={Boolean(missing) || closed} onClick={() => setClosed(true)}><Send size={16} />{closed ? 'Закрыто' : 'Закрыть пакет'}</button></div></div></Panel>
  </div>
}
