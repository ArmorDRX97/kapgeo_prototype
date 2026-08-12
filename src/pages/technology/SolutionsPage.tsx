import { Link } from '@tanstack/react-router'
import { Beaker, CheckCircle2, Clock3, Save } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const samples = [{ id: 'SOL-0821', point: 'Кислотный узел', taken: '09:20', status: 'published', acidity: 42.6, iron: 1.18 }, { id: 'SOL-0822', point: 'Резервуар R-02', taken: '10:00', status: 'late', acidity: null, iron: null }, { id: 'SOL-0823', point: 'Коллектор WELL-1042', taken: '10:15', status: 'analyzing', acidity: null, iron: null }]
export function SolutionsPage() {
  const [selectedId, setSelectedId] = useState('SOL-0822')
  const [acidity, setAcidity] = useState('39.8')
  const [saved, setSaved] = useState(false)
  const selected = samples.find((sample) => sample.id === selectedId)!
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-07" title="Растворы и лаборатория" description="Цепочка пробы от отбора до публикации. Поздние и непроверенные результаты видны до расчёта баланса." meta={<Badge tone="warning" dot>1 результат просрочен</Badge>} actions={<Link to="/technology/balance" className="button button--secondary button--md">К балансу</Link>} />
    <div className="solutions-layout"><Panel title="Пробы смены" description="10 августа · смена 08:00–20:00"><div className="solution-list">{samples.map((sample) => <button type="button" key={sample.id} onClick={() => { setSelectedId(sample.id); setSaved(false) }} className={selectedId === sample.id ? 'is-selected' : ''}><Beaker size={18} /><span><strong>{sample.id} · {sample.point}</strong><small>Отбор {sample.taken}</small></span><Badge tone={sample.status === 'published' ? 'success' : sample.status === 'late' ? 'warning' : 'ai'}>{sample.status === 'published' ? 'Опубликована' : sample.status === 'late' ? 'Просрочена' : 'Анализ'}</Badge></button>)}</div></Panel><aside className="solutions-aside"><Panel title={selected.id} description={`${selected.point} · отбор ${selected.taken}`}><div className="solution-chain"><span className="is-done">Отбор</span><span className="is-done">Доставка</span><span className={selected.status === 'published' ? 'is-done' : 'is-active'}>Анализ</span><span className={selected.status === 'published' ? 'is-done' : ''}>QA/QC</span><span className={selected.status === 'published' ? 'is-done' : ''}>Публикация</span></div>{selected.status === 'published' ? <div className="solution-result"><CheckCircle2 size={20} /><strong>H₂SO₄: {selected.acidity} г/л</strong><span>Fe: {selected.iron}% · метод: титрование · QA/QC пройден</span></div> : <div className="solution-form"><label><span>H₂SO₄, г/л</span><input type="number" value={acidity} min="0" max="100" onChange={(event) => { setAcidity(event.target.value); setSaved(false) }} /></label><label><span>Метод</span><select defaultValue="Титрование"><option>Титрование</option><option>Спектрометрия</option></select></label><p><Clock3 size={16} />Результат будет отмечен как поздний и инициирует пересчёт баланса.</p><button type="button" className="button button--primary button--md" onClick={() => setSaved(true)}><Save size={16} />{saved ? 'Результат сохранён' : 'Сохранить и QA/QC'}</button></div>}</Panel></aside></div>
  </div>
}
