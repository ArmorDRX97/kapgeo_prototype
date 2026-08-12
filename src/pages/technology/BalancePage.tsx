import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Beaker, Scale } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function BalancePage() {
  const [action, setAction] = useState<'none' | 'repeat' | 'rvr'>('none')
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-10–12" title="Материальный баланс и отклонение" description="Смена 10 августа · BLK-07-12. Небаланс раскрыт до первичных значений и требует решения технолога." meta={<Badge tone="warning" dot>DEV-042 · новый</Badge>} actions={<Link to="/technology/rvr/DEV-042" className="button button--secondary button--md">Открыть РВР</Link>} />
    <div className="balance-layout"><Panel title="Баланс раствора" description="Методика v1.0 · порог небаланса 3,0%"><div className="balance-flow"><div><span>Приход</span><strong>1 248 м³</strong><small>НС-04 · 10:20</small></div><ArrowRight size={20} /><div><span>Расход</span><strong>1 181 м³</strong><small>16 скважин · 10:25</small></div><ArrowRight size={20} /><div className="is-warning"><span>Небаланс</span><strong>+67 м³</strong><small>4,8% · выше порога</small></div></div><div className="balance-components"><div><span>Изменение запаса</span><b>+18 м³</b></div><div><span>Поздние замеры</span><b>+26 м³</b></div><div><span>Потери/корректировки</span><b>+23 м³</b></div></div></Panel><aside className="balance-aside"><Panel title="Evidence" description="Что привело к отклонению"><div className="correlation-checks"><div><Badge tone="warning">Свежесть</Badge><span>WELL-1042: приемистость не введена в пакет смены.</span></div><div><Badge tone="ai">AI-подсказка</Badge><span>Вероятна связь с падением pH на кислотном узле.</span></div></div></Panel><Panel title="Действие технолога" description="Автоматическое изменение режима недоступно"><div className="balance-actions"><button type="button" className={action === 'repeat' ? 'is-selected' : ''} onClick={() => setAction('repeat')}><Beaker size={18} />Запросить повторный замер</button><button type="button" className={action === 'rvr' ? 'is-selected' : ''} onClick={() => setAction('rvr')}><AlertTriangle size={18} />Создать кандидат РВР</button>{action !== 'none' && <p><Scale size={16} />{action === 'repeat' ? 'Задача диспетчеру создана.' : 'Кандидат РВР создан: требуется план и review.'}</p>}</div></Panel></aside></div>
  </div>
}
