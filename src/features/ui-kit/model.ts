export const kitSections = [
  { id: 'overview', title: 'Обзор', group: 'Начало', keywords: 'каталог компоненты дизайн', description: 'Живая библиотека интерфейса KAPGEO. От базового цвета до рабочей области с несколькими источниками данных.' },
  { id: 'colors', title: 'Цвета и поверхности', group: 'Основы', keywords: 'палитра hex токены тени отступы радиусы', description: 'Семантические цвета, предметная палитра, поверхности и геометрия элементов.' },
  { id: 'typography', title: 'Типографика', group: 'Основы', keywords: 'шрифт Segoe Roboto Arial текст заголовки', description: 'Фирменные гарнитуры КАП, размеры, начертания и иерархия текста. Segoe UI, Roboto и Arial показаны отдельно.' },
  { id: 'buttons', title: 'Кнопки и статусы', group: 'Компоненты', keywords: 'badge бадж иконки опасные действия disabled', description: 'Основные и вторичные действия, иконки, состояния доступности и статусные метки.' },
  { id: 'forms', title: 'Поля и переключатели', group: 'Компоненты', keywords: 'input select textarea checkbox radio switch форма заблокирован ошибка', description: 'Ввод данных, выбор, валидация и различия между disabled и read-only.' },
  { id: 'navigation', title: 'Навигация и меню', group: 'Компоненты', keywords: 'табы tabs вкладки выпадающий фильтр tooltip подсказка', description: 'Вкладки, меню действий, фильтры, раскрывающиеся группы и подсказки.' },
  { id: 'dialogs', title: 'Окна и подтверждения', group: 'Компоненты', keywords: 'модалка dialog отмена подтверждение удаление сохранение popup', description: 'Рабочие формы, компактные окна, удаление и защита несохранённого ввода. Каждый вариант можно открыть.' },
  { id: 'tables', title: 'Таблицы', group: 'Данные', keywords: 'реестр редактирование группировка сортировка пагинация сравнение', description: 'Реестр с выбором строки, редактируемые интервалы, группировка и матрица сравнения.' },
  { id: 'feedback', title: 'Обратная связь', group: 'Данные', keywords: 'loading error empty success skeleton прогресс загрузка ошибка пусто', description: 'Загрузка, пустая выдача, ошибка, успешное действие и сообщения о состоянии.' },
  { id: 'geology', title: 'Карты и графики', group: 'Данные', keywords: 'каротаж диаграмма легенда порода глубина скважина', description: 'Геологические кривые, глубинная колонка, легенды и выбор объектов на карте.' },
  { id: 'layouts', title: 'Рабочие области', group: 'Компоновки', keywords: 'БГД BGD карточка расширенная таблицы график паспорт', description: 'Независимые примеры: карточка БГД, расширенная область с таблицами и графиком, оформление документа.' },
] as const
export type KitSection = typeof kitSections[number]['id']
export function validateKitSearch(input: Record<string, unknown>): { section?: KitSection } {
  return { section: kitSections.some(s => s.id === input.section) && input.section !== 'overview' ? input.section as KitSection : undefined }
}
export const sampleWells = Array.from({ length: 18 }, (_, i) => ({
  id: `kit-well-${i + 1}`, name: `СК-${String(i + 1).padStart(3, '0')}`, site: i < 9 ? 'Участок А' : 'Участок Б',
  type: ['Разведочная', 'Откачная', 'Закачная'][i % 3]!, depth: 300 + i * 8.4,
  status: i % 4 === 0 ? 'На проверке' : 'Проверена',
}))
export const initialIntervals = [
  { id: 'i1', from: 0, to: 120, rock: 'Глина', permeability: 'Непроницаемые' },
  { id: 'i2', from: 120, to: 240, rock: 'Песок', permeability: 'Проницаемые' },
  { id: 'i3', from: 240, to: 360, rock: 'Алевролит', permeability: 'Не определено' },
]
