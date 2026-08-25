import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Accessibility, Contrast, Languages, MousePointer2 } from 'lucide-react'
import { fetchPlatformPreferences, savePlatformPreferences } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AccessibilityPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const mutation = useMutation({ mutationFn: savePlatformPreferences, onSuccess: (next) => queryClient.setQueryData(['platform-preferences'], next) })
  if (!query.data) return <div className="page-loading"><span /><p>Загружаем настройки доступности…</p></div>
  const preferences = query.data
  const save = (next: typeof preferences) => mutation.mutate(next)
  return <div className="page-stack"><PageHeader eyebrow="Качество интерфейса · GEOX-E12" title="Доступность и отображение" description="Настройки применяются сразу и сохраняются в IndexedDB для следующего открытия." meta={<Badge tone="success" dot>Keyboard focus и skip-link включены</Badge>} />
    <div className="accessibility-grid"><Panel title="Отображение" description="Персональные настройки интерфейса"><div className="accessibility-settings"><label><span><Contrast size={19} /><strong>Высокий контраст</strong></span><input type="checkbox" checked={preferences.contrast} onChange={(event) => save({ ...preferences, contrast: event.target.checked })} /></label><label><span><MousePointer2 size={19} /><strong>Уменьшить движение</strong></span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => save({ ...preferences, reducedMotion: event.target.checked })} /></label><label><span><Accessibility size={19} /><strong>Плотность</strong></span><select value={preferences.density} onChange={(event) => save({ ...preferences, density: event.target.value as typeof preferences.density })}><option value="comfortable">Комфортная</option><option value="compact">Компактная</option></select></label></div></Panel><aside className="accessibility-aside"><Panel title="Локализация" description="Сохраняемый язык"><div className="accessibility-note"><Languages size={20} /><span><strong>{preferences.locale.toUpperCase()} — текущий язык</strong><small>RU/KZ/EN terminology переключается без reload; отсутствующие строки явно отмечаются fallback.</small></span></div></Panel><Panel title="Проверочный чек‑лист" description="P0 flow"><ul className="accessibility-checklist"><li>Навигация с клавиатуры и видимый focus</li><li>Non-color status cues и семантические labels</li><li>Reduced motion через document preference</li><li>390/1024/1440 px compatibility flags</li></ul></Panel></aside></div>
  </div>
}
