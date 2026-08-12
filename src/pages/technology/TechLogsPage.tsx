import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, RadioTower, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function TechLogsPage() {
  const [depth, setDepth] = useState(386)
  const [compare, setCompare] = useState(true)
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-20" title="Технологические ГИС" description="WELL-1042 · исследование приемистости. Синхронная глубина, технологические кривые и сравнение с предыдущей датой." meta={<Badge tone="success" dot>QC пройден · 10 августа</Badge>} actions={<Link to="/objects/wells/$wellId" params={{ wellId: 'WELL-1042' }} search={{ tab: 'logs' }} className="button button--secondary button--md">К геологическим ГИС</Link>} />
    <div className="techlogs-toolbar"><div className="segmented-control"><button type="button" className={!compare ? 'is-active' : ''} onClick={() => setCompare(false)}>Текущий замер</button><button type="button" className={compare ? 'is-active' : ''} onClick={() => setCompare(true)}>Сравнение с 03 авг.</button></div><div><button type="button" aria-label="Меньшая глубина" onClick={() => setDepth((value) => Math.max(0, value - 5))}><ChevronLeft size={17} /></button><strong>{depth} м</strong><button type="button" aria-label="Большая глубина" onClick={() => setDepth((value) => Math.min(612, value + 5))}><ChevronRight size={17} /></button></div></div>
    <Panel title="Профиль приемистости" description="Курсор синхронизирует все кривые и inspector."><div className="techlogs-viewer"><div className="techlogs-scale"><span>0</span><span>150</span><span>300</span><span>450</span><span>600 м</span></div><div className="techlogs-track techlogs-track--lith"><strong>Интервалы</strong><i /><i /><i /><i /></div><div className="techlogs-track"><strong>Приемистость</strong><svg viewBox="0 0 120 330" preserveAspectRatio="none"><path d="M30 0 L76 55 L48 115 L92 175 L61 235 L85 330" />{compare && <path className="is-compare" d="M53 0 L64 55 L36 115 L73 175 L43 235 L62 330" />}</svg></div><div className="techlogs-track"><strong>Давление</strong><svg viewBox="0 0 120 330" preserveAspectRatio="none"><path d="M70 0 L43 55 L79 115 L51 175 L84 235 L48 330" />{compare && <path className="is-compare" d="M82 0 L55 55 L91 115 L60 175 L94 235 L61 330" />}</svg></div><div className="techlogs-cursor" style={{ top: `${depth / 612 * 330 + 38}px` }} /></div></Panel>
    <div className="techlogs-inspector"><RadioTower size={20} /><div><strong>Глубина {depth} м</strong><span>Приемистость 79 м³/ч · давление 1,6 МПа · источник: TECHLOG-1042-08</span></div><Badge tone="warning">−3 м³/ч к плану</Badge><SlidersHorizontal size={19} /></div>
  </div>
}
