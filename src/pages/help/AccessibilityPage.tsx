import { Accessibility, Contrast, Languages, MousePointer2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AccessibilityPage() {
  const [contrast, setContrast] = useState(false)
  const [motion, setMotion] = useState(false)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const apply = (name: string, value: string) => document.documentElement.dataset[name] = value
  return <div className="page-stack"><PageHeader eyebrow="Качество интерфейса · E14–E15" title="Доступность и отображение" description="Настройки применяются сразу в браузере и позволяют изменить контраст, анимации и плотность рабочих областей." meta={<Badge tone="success" dot>Keyboard focus и skip-link включены</Badge>} />
    <div className="accessibility-grid"><Panel title="Отображение" description="Персональные настройки интерфейса"><div className="accessibility-settings"><label><span><Contrast size={19} /><strong>Высокий контраст</strong></span><input type="checkbox" checked={contrast} onChange={(event) => { setContrast(event.target.checked); apply('contrast', event.target.checked ? 'high' : 'normal') }} /></label><label><span><MousePointer2 size={19} /><strong>Уменьшить движение</strong></span><input type="checkbox" checked={motion} onChange={(event) => { setMotion(event.target.checked); apply('motion', event.target.checked ? 'reduced' : 'normal') }} /></label><label><span><Accessibility size={19} /><strong>Плотность</strong></span><select value={density} onChange={(event) => { const value = event.target.value as typeof density; setDensity(value); apply('density', value) }}><option value="comfortable">Комфортная</option><option value="compact">Компактная</option></select></label></div></Panel><aside className="accessibility-aside"><Panel title="Локализация" description="Языки интерфейса"><div className="accessibility-note"><Languages size={20} /><span><strong>RU — основной рабочий язык</strong><small>Поддержка KZ и EN планируется в отдельных каталогах локализации.</small></span></div></Panel><Panel title="Проверочный чек‑лист" description="P0 flow"><ul className="accessibility-checklist"><li>Навигация с клавиатуры и видимый focus</li><li>Контраст статусов и текстовых альтернатив</li><li>1024px, tablet и mobile read-only</li><li>Отсутствие скрытых критичных полей</li></ul></Panel></aside></div>
  </div>
}
