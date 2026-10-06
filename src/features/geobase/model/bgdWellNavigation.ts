import { BookOpen, Compass, FileText, Gauge, Info, Layers3, MapPin, RadioTower, Ruler, TestTube2, Wrench } from 'lucide-react'
import type { BgdWellSection } from './bgdWellSection'

export const bgdWellNavigationGroups = [
  { id: 'well', label: 'Скважина', items: [
    { id: 'description', label: 'Описание', icon: Info },
    { id: 'geometry', label: 'Координаты и глубина', icon: MapPin },
    { id: 'drilling', label: 'Проходка и освоение', icon: Wrench },
    { id: 'passport', label: 'Паспорт', icon: BookOpen },
    { id: 'documentation', label: 'Документация', icon: FileText },
  ] },
  { id: 'primary', label: 'Первичные данные', items: [
    { id: 'core-runs', label: 'Керновые рейсы и промер', icon: Ruler },
    { id: 'core-samples', label: 'Керновые пробы', icon: TestTube2 },
    { id: 'logs', label: 'Каротажи', icon: RadioTower },
    { id: 'deviation', label: 'Инклинометрия', icon: Compass },
  ] },
  { id: 'geological', label: 'Геологические данные', items: [
    { id: 'geology', label: 'Геологические условия', icon: Gauge },
    { id: 'lithology', label: 'Литология', icon: Layers3 },
    { id: 'ore-intervals', label: 'Рудные интервалы', icon: Layers3 },
  ] },
] as const

export function getBgdSectionLabel(section: BgdWellSection) {
  const normalized = section === 'development' ? 'drilling' : section
  for (const group of bgdWellNavigationGroups) {
    const match = group.items.find((item) => item.id === normalized)
    if (match) return match.label
  }
  return 'Описание'
}
