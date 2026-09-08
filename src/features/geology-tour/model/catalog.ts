import type { GeologyTourDefinition, GeologyTourStep, GeologyTourTarget } from './types'

const pageTarget = (text?: string): GeologyTourTarget => ({ selector: '.page-header, .object-header, .compare-header, .wizard-header', text })
const panelTarget = (text: string): GeologyTourTarget => ({ selector: '.panel', text })
const target = (selector: string, text?: string): GeologyTourTarget => ({ selector, text })

const step = (
  id: string,
  route: string,
  focus: GeologyTourTarget,
  eyebrow: string,
  title: string,
  description: string,
  hint?: string,
): GeologyTourStep => ({ id, route, target: focus, eyebrow, title, description, hint })

const orientation: GeologyTourStep[] = [
  step('orientation-context', '/geology', target('.context-selector'), 'Основы навигации', 'Рабочий контекст', 'Месторождение, участок и организационная область определяют доступные объекты, фильтры и действия.', 'Перед изменением контекста убедитесь, что черновики сохранены.'),
  step('orientation-date', '/geology', target('.as-of-selector'), 'Основы навигации', 'Срез на дату', 'Дата управляет историческим состоянием карты, реестров и опубликованных версий.'),
  step('orientation-search', '/geology', target('.global-search'), 'Основы навигации', 'Глобальный поиск', 'Отсюда можно быстро открыть скважину, блок, отчёт или результат моделирования.'),
  step('orientation-module', '/geology', target('.sidebar__nav a', 'Геология'), 'Основы навигации', 'Вход в геологический модуль', 'Пункт «Геология» возвращает на обзор модуля из любой части системы.'),
  step('orientation-overview', '/geology', pageTarget('Геология месторождения'), 'Обзор модуля', 'Геология месторождения', 'Стартовая страница объединяет качество данных, быстрые переходы и объекты, требующие внимания.'),
  step('orientation-map-preview', '/geology', panelTarget('Скважины и качество данных'), 'Обзор модуля', 'Карта и качество', 'Карта показывает пространственное положение скважин и помогает перейти к детальному рабочему экрану.'),
  step('orientation-attention', '/geology', panelTarget('Требует внимания'), 'Обзор модуля', 'Очередь внимания', 'Здесь собраны проблемы качества, расхождения интерпретаций и незавершённые процессы.'),
]

const geobase: GeologyTourStep[] = [
  step('bgd-page', '/geology/bgd', pageTarget('База геологических данных'), 'БГД', 'Месторождения', 'БГД хранит небольшой набор месторождений как корневые объекты, от которых дальше наследуются участки, залежи, скважины и связанные данные.'),
  step('bgd-registry', '/geology/bgd', target('[data-geology-tour="bgd-registry"]'), 'БГД', 'Карточки месторождений', 'Крупные карточки показывают код, названия RU/KZ/EN, описание, участки, залежи, систему координат, видимость и текущее месторождение.'),
  step('bgd-create', '/geology/bgd', target('[data-geology-tour="bgd-create"]'), 'БГД', 'Создание месторождения', 'Отдельное заметное действие создаёт новый корневой объект: задайте уникальный числовой код, названия на трёх языках, тип, необязательную систему координат, описания и список залежей.'),
  step('bgd-tabs', '/geology/bgd/DEP-SARYTAU', target('[data-geology-tour="bgd-tabs"]'), 'БГД', 'Разделы месторождения', 'Вкладки разделяют основные сведения, участки и залежи, кондиционные лимиты, скважины, редактирование и доступный по правам аудит.'),
  step('bgd-editor', '/geology/bgd/DEP-SARYTAU?section=edit', target('[data-geology-tour="bgd-editor"]'), 'БГД', 'Карточка и безопасный CRUD', 'Редактируйте атрибуты и видимость, добавляйте вложенные объекты и удаляйте только месторождения без зависимых данных.'),
  step('bgd-well-logs', '/geology/bgd/DEP-SARYTAU/wells/WELL-1010-FULL?tab=logs', target('[data-geology-tour="bgd-well-logs"]'), 'БГД', 'Каротажи скважины', 'Выберите исследование, проверьте дату, оператора, прибор, интервал и каналы, затем откройте кривые или добавьте новый набор.'),
]
const masterAndMethods: GeologyTourStep[] = [
  step('master-page', '/geology/master', pageTarget(), 'Справочники', 'Геологическая иерархия', 'Месторождения, участки, залежи и наборы кондиций управляются как версионируемые справочные сущности.'),
  step('master-tree', '/geology/master', target('.master-layout, .master-data-layout, #main-content'), 'Справочники', 'Структура объектов', 'Выберите сущность, изучите её состояние и создайте новую версию вместо изменения опубликованных данных на месте.'),
  step('methodology-page', '/geology/methodology', pageTarget('Методический центр'), 'Методический центр', 'Правила демонстрационного прототипа', 'Центр объясняет границы модулей, методики, формулы, справочники, шаблоны и ограничения synthetic-расчётов.'),
  step('methodology-contours', '/geology/methodology', panelTarget('Walkthrough пяти контуров'), 'Методический центр', 'Пять предметных контуров', 'Заказчик или аналитик может подтвердить охват каждого контура либо оставить вопрос.'),
  step('methodology-methods', '/geology/methodology', panelTarget('Четыре методики'), 'Методический центр', 'Методики и формулы', 'Переключайте методы, изучайте входы и запускайте только маркированные synthetic examples.'),
  step('methodology-definitions', '/geology/methodology', panelTarget('Справочники и кондиции'), 'Методический центр', 'Версионные условия', 'Для каждой кондиции видны владелец, дата действия, версия и влияние на последующие результаты.'),
  step('methodology-templates', '/geology/methodology', panelTarget('Галерея output templates'), 'Методический центр', 'Шаблоны результатов', 'Предпросмотр и manifest шаблона не меняют научные данные и сохраняются отдельно.'),
  step('methodology-volume', '/geology/methodology', panelTarget('Профиль демонстрационной нагрузки'), 'Методический центр', 'Профили нагрузки', 'Сценарии показывают поведение прототипа на разных synthetic-объёмах и не являются SLA.'),
]

const registryAndMap: GeologyTourStep[] = [
  step('map-page', '/geology/map', pageTarget('Карта скважин'), 'Карта', 'Карта скважин и объектов', 'Карта, список и инспектор используют одну выборку: выбор в одном представлении синхронизирует остальные.'),
  step('map-toolbar', '/geology/map', target('.map-layer-toolbar, .workspace-toolbar'), 'Карта', 'Слои и отображение', 'Включайте подписи, контуры и качество, сохраняя персональные настройки рабочего пространства.'),
  step('map-canvas', '/geology/map', panelTarget('План участка Северный'), 'Карта', 'План участка', 'Маркеры отражают synthetic-скважины; выбор объекта обновляет инспектор и может быть передан в URL.'),
  step('map-inspector', '/geology/map', panelTarget('Инспектор объекта'), 'Карта', 'Инспектор выбранного объекта', 'Инспектор показывает ключевые свойства и открывает карточку без потери контекста карты.'),
  step('wells-page', '/geology/wells', pageTarget('Реестр скважин'), 'Реестр', 'Все скважины', 'Реестр поддерживает поиск, фильтры, сохранённые представления, выбор объекта и переход в карточку.'),
  step('wells-filters', '/geology/wells', target('.well-filter-bar, .filter-bar, .advanced-filters'), 'Реестр', 'Фильтры и представления', 'Сочетайте код, статус, тип, качество и участок. Контекст выборки сохраняется в URL.'),
  step('wells-results', '/geology/wells', panelTarget('Результаты'), 'Реестр', 'Результаты и сортировка', 'Строка открывает выбранную скважину, а состояние фильтров позволяет вернуться к той же выборке.'),
  step('new-well-page', '/geology/wells/new', pageTarget(), 'Новая скважина', 'Создание черновика', 'Мастер создаёт synthetic-скважину по шагам и сразу открывает её карточку в статусе черновика.'),
  step('new-well-wizard', '/geology/wells/new', target('.wizard-card, .new-well-form, form'), 'Новая скважина', 'Обязательные данные', 'Заполните идентификацию, принадлежность и координаты; проверки не позволят перейти дальше с ошибками.'),
]

const wellOverview: GeologyTourStep[] = [
  step('well-header', '/objects/wells/WELL-1042', target('.object-header'), 'Карточка скважины', 'Единый объект WELL-1042', 'Шапка показывает статус, версию, координаты, глубину, полноту и дату изменения.'),
  step('well-actions', '/objects/wells/WELL-1042', target('.object-header__actions'), 'Карточка скважины', 'Версии и новый черновик', 'Критичные изменения создают новую версию; опубликованный snapshot не редактируется на месте.'),
  step('well-tabs', '/objects/wells/WELL-1042', target('.object-tabs'), 'Карточка скважины', 'Все тематические вкладки', 'Один объект связывает паспорт, бурение, литологию, ГИС, пробы, документы, модель и аудит.'),
  step('well-status', '/objects/wells/WELL-1042', panelTarget('Состояние данных'), 'Карточка скважины', 'Сводка доменов', 'Карточки показывают готовность каждой предметной области и связанные версии.'),
  step('well-profile', '/objects/wells/WELL-1042', panelTarget('Геологический профиль'), 'Карточка скважины', 'Профиль по глубине', 'Литология, каротаж и интерпретация объединены в синхронном сводном представлении.'),
  step('well-action', '/objects/wells/WELL-1042', panelTarget('Требуется действие'), 'Карточка скважины', 'Следующее экспертное действие', 'Система объясняет проблему и ведёт к сравнению ручного и AI-варианта.'),
]

const passportAndDrilling: GeologyTourStep[] = [
  step('passport-assignment', '/objects/wells/WELL-1042?tab=passport', panelTarget('Принадлежность и проект'), 'Паспорт', 'Назначение скважины', 'Месторождение, участок, залежь и проект сохраняются отдельно от геометрии и конструкции.'),
  step('passport-sections', '/objects/wells/WELL-1042?tab=passport', panelTarget('Полный паспорт'), 'Паспорт', 'Независимые разделы паспорта', 'Описание, документы, проходка, освоение и геология получают собственные версии и артефакты.'),
  step('passport-review', '/objects/wells/WELL-1042?tab=passport', panelTarget('Review и публикация'), 'Паспорт', 'Проверка и публикация', 'Маршрут переводит aggregate через review и publication, сохраняя историю решений.'),
  step('passport-versioned', '/objects/wells/WELL-1042?tab=passport', target('.passport-workspace, .passport-layout'), 'Паспорт', 'Координаты, конструкция и влияние', 'Изменение координат требует причины и показывает downstream impact до сохранения новой версии.'),
  step('drilling-trajectory', '/objects/wells/WELL-1042?tab=drilling', panelTarget('Инклинометрия и траектория'), 'Бурение и керн', 'Траектория скважины', 'Импортируйте deterministic fixture, проверяйте станции и рассматривайте plan/TVD preview.'),
  step('drilling-core', '/objects/wells/WELL-1042?tab=drilling', panelTarget('Керн и depth mapping'), 'Бурение и керн', 'Рейсы, выход керна и коробки', 'Команды reverse, split, merge, rebin и no-core работают с черновиком и поддерживают undo/redo.'),
  step('drilling-qc', '/objects/wells/WELL-1042?tab=drilling', panelTarget('QC и evidence'), 'Бурение и керн', 'Проверки и evidence', 'Блокирующие ошибки запрещают сохранение, а CSV-экспорт формируется из текущей synthetic-траектории.'),
]

const lithologyAndSamples: GeologyTourStep[] = [
  step('lithology-versioned', '/objects/wells/WELL-1042?tab=lithology', panelTarget('Versioned geological tracks'), 'Литология', 'Версионные геологические треки', 'Керн, ГИС, composite и стратиграфия хранятся раздельно; границы и overrides меняют только черновик.'),
  step('lithology-editor', '/objects/wells/WELL-1042?tab=lithology', target('.lithology-workspace, .lithology-layout'), 'Литология', 'Редактор интервалов', 'Выберите интервал, исправьте границы и атрибуты, устраните разрывы и просмотрите diff перед сохранением.'),
  step('lithology-template', '/objects/wells/WELL-1042?tab=lithology', target('.column-template'), 'Литология', 'Шаблон геологической колонки', 'Состав треков сохраняется отдельно от данных конкретной скважины.'),
  step('samples-chain', '/objects/wells/WELL-1042?tab=samples', panelTarget('Sample → laboratory → QA/QC'), 'Пробы', 'Цепочка проб и лаборатории', 'Проба проходит от отбора и заявки до результата и QA acceptance с сохранением связей с интервалом.'),
  step('samples-registry', '/objects/wells/WELL-1042?tab=samples', panelTarget('Реестр проб'), 'Пробы', 'Реестр проб', 'Создавайте пробу из интервала, проверяйте тип, номер, глубину и текущее состояние.'),
  step('samples-lab', '/objects/wells/WELL-1042?tab=samples', panelTarget('Лабораторные результаты'), 'Пробы', 'Результаты и QA/QC', 'Единицы, qualifiers, метод, аналитик и неопределённость сохраняются вместе с решением контроля качества.'),
  step('samples-granulometry', '/objects/wells/WELL-1042?tab=samples', panelTarget('Гранулометрия'), 'Пробы', 'Гранулометрия и LIMS staging', 'Гистограмма показывает synthetic bins; staging применяется только после проверки конфликта.'),
]

const logsAndInterpretation: GeologyTourStep[] = [
  step('logs-import', '/objects/wells/WELL-1042?tab=logs', panelTarget('ГИС import'), 'ГИС', 'Импорт, mapping и QC', 'Bundled LAS и local fixture проходят разбор, сопоставление каналов и подтверждение QC перед применением.'),
  step('logs-registry', '/objects/wells/WELL-1042?tab=logs', panelTarget('LogRun registry'), 'ГИС', 'Версии LogRun и кривых', 'Derived curve, merge и выбор основной GR создают новые lineage-связи, не перезаписывая source.'),
  step('logs-viewer', '/objects/wells/WELL-1042?tab=logs', panelTarget('Bounded LogViewer'), 'ГИС', 'Каротажный планшет', 'Курсор, видимый диапазон, треки, overlay, маркеры и табличный fallback работают в одном workspace.'),
  step('logs-layout', '/objects/wells/WELL-1042?tab=logs', panelTarget('Tracks and layout template'), 'ГИС', 'Шаблон треков', 'Порядок, масштабы и состав треков относятся к представлению и не инвалидируют scientific version.'),
  step('interpretation-perm', '/objects/wells/WELL-1042?tab=logs', panelTarget('Интерпретация проницаемости'), 'Интерпретация', 'Ручные и автоматические интервалы', 'Manual и automatic proposals существуют раздельно и применяются только после явного сохранения.'),
  step('interpretation-alignment', '/objects/wells/WELL-1042?tab=logs', panelTarget('Differential, ore and tech alignment'), 'Интерпретация', 'Сопоставление интервалов', 'Differential source, рудные и технологические интервалы можно соединять, обрезать и разделять.'),
  step('interpretation-ai', '/objects/wells/WELL-1042?tab=logs', panelTarget('AI proposal'), 'Интерпретация', 'AI под решением человека', 'AI-версия, confidence и evidence остаются отличимыми от ручных данных до human resolution.'),
  step('logs-classic', '/objects/wells/WELL-1042?tab=logs', target('.logs-workspace'), 'ГИС', 'Реестр исследований и классический viewer', 'Откройте набор, проверьте QC, запустите viewer и сохраните ручную интерпретацию с обязательным обоснованием.'),
]

const outputsAndAudit: GeologyTourStep[] = [
  step('documents-column', '/objects/wells/WELL-1042?tab=documents', panelTarget('SVG geological well column'), 'Документы и вывод', 'Геологическая колонка', 'Колонка собирается из exact version и шаблона; треки, подписи и шкалы настраиваются независимо.'),
  step('documents-export', '/objects/wells/WELL-1042?tab=documents', panelTarget('Export preview and legend'), 'Документы и вывод', 'Многостраничный экспорт', 'Preview управляет страницами, crop и rotation и создаёт browser artifact с manifest.'),
  step('documents-files', '/objects/wells/WELL-1042?tab=documents', panelTarget('Documents'), 'Документы и вывод', 'Файлы и версии', 'Synthetic/local-файлы можно добавить, скачать и архивировать без удаления истории.'),
  step('documents-map', '/objects/wells/WELL-1042?tab=documents', panelTarget('GIS-like map'), 'Документы и вывод', 'Карта и управляемые представления', 'Изменения геометрии валидируются, а сохранённые виды заменяют небезопасные raw-запросы.'),
  step('audit-workspace', '/objects/wells/WELL-1042?tab=audit', target('.audit-workspace, .well-audit, #main-content .panel'), 'Аудит', 'Полная история объекта', 'Timeline объединяет версии паспорта, конструкции, научные задачи, request ID и evidence.'),
  step('linked-technology', '/objects/wells/WELL-1042?tab=technology', panelTarget('Технология'), 'Связанные представления', 'Технологическая вкладка', 'Маршрут зарезервирован для связанного технологического представления единой скважины.'),
  step('linked-equipment', '/objects/wells/WELL-1042?tab=equipment', panelTarget('Оборудование'), 'Связанные представления', 'Оборудование', 'Маршрут показывает границу между геологической карточкой и данными оборудования.'),
  step('linked-model', '/objects/wells/WELL-1042?tab=model', panelTarget('Модель'), 'Связанные представления', 'Модель', 'Маршрут предназначен для exact-version связи скважины с моделями и расчётами.'),
]

const projectsAndPublication: GeologyTourStep[] = [
  step('compare-page', '/geology/interpretations/INT-WELL-1042-07/compare', pageTarget(), 'Экспертное решение', 'Сравнение интерпретаций', 'Ручной, AI и скорректированный варианты сравниваются на одном диапазоне и масштабе.'),
  step('compare-options', '/geology/interpretations/INT-WELL-1042-07/compare', target('.resolution-options'), 'Экспертное решение', 'Выбор итоговой границы', 'Выберите источник результата; для скорректированного варианта укажите глубину и обязательное основание.'),
  step('compare-decision', '/geology/interpretations/INT-WELL-1042-07/compare', panelTarget('Экспертное решение'), 'Экспертное решение', 'Сохранение и отправка', 'Решение сначала сохраняется как новая версия, затем отдельно передаётся на проверку.'),
  step('correlation-page', '/geology/correlation', pageTarget('Разрез и корреляция'), 'Разрез', 'Профиль PR-07', 'Рабочая область сопоставляет горизонты нескольких скважин и фиксирует опорный объект.'),
  step('correlation-section', '/geology/correlation', panelTarget('Корреляционный разрез'), 'Разрез', 'Корреляционное полотно', 'Переключайте datum, выбирайте скважину и проверяйте прослеживание горизонтов.'),
  step('correlation-control', '/geology/correlation', panelTarget('Контроль корреляции'), 'Разрез', 'Проверки и AI-подсказки', 'Статусы совпадения, экспертной проверки и AI-предложения визуально различаются.'),
  step('section-project', '/geology/correlation', panelTarget('SectionProject PR-07'), 'Разрез', 'Версионный SectionProject', 'Route, corridor, connectivity, helper intervals, contours и drawing сохраняются в отдельном проекте.'),
  step('reserves-page', '/geology/reserves', pageTarget('Проект подсчёта запасов'), 'Запасы', 'Проект запасов', 'Все расчёты маркированы как DEMO и работают на immutable synthetic snapshot.'),
  step('reserves-workbench', '/geology/reserves', target('.reserve-project-workspace, .object-workspace'), 'Запасы', 'Четыре методики и геометрия', 'Пересечения, выравнивание толщин, блоки, ячейки и четыре методики сохраняют независимые runs.'),
  step('reserves-inputs', '/geology/reserves', panelTarget('Исходные параметры'), 'Запасы', 'Параметры preview', 'Измените площадь, мощность, плотность и содержание и изучите прозрачную synthetic-формулу.'),
  step('reserves-result', '/geology/reserves', panelTarget('Результат расчёта'), 'Запасы', 'Результат и review', 'Передача на review фиксирует версию черновика; результат не становится производственным расчётом.'),
  step('delivery-page', '/geology/delivery', pageTarget(), 'Публикация', 'Пакет геологических данных', 'Composer собирает exact versions, ограничения и потребителей в immutable demo-package.'),
  step('delivery-composer', '/geology/delivery', target('.publication-main'), 'Публикация', 'Состав и согласование', 'Выберите источники, выполните demo re-auth и создайте решение approve/return без имитации юридической ЭЦП.'),
  step('delivery-consumers', '/geology/delivery', target('.publication-aside'), 'Публикация', 'Передача потребителям', 'Technology, Modeling и Analytics получают точные ссылки; withdrawal и replacement сохраняют историю.'),
]

const uniqueSteps = (groups: GeologyTourStep[][]) => {
  const seen = new Set<string>()
  return groups.flat().filter((item) => !seen.has(item.id) && seen.add(item.id))
}

export const geologyTourDefinitions: GeologyTourDefinition[] = [
  {
    id: 'geology-complete',
    title: 'Полная экскурсия по геологии',
    description: 'Весь модуль: от контекста и справочников до скважины, запасов и публикации.',
    estimatedMinutes: 39,
    steps: uniqueSteps([orientation, geobase, masterAndMethods, registryAndMap, wellOverview, passportAndDrilling, lithologyAndSamples, logsAndInterpretation, outputsAndAudit, projectsAndPublication]),
  },
  { id: 'geology-start', title: 'Первое знакомство', description: 'Контекст, навигация, обзор, карта и реестр.', estimatedMinutes: 6, steps: uniqueSteps([orientation, geobase, registryAndMap]) },
  { id: 'geology-bgd', title: 'БГД и месторождения', description: 'Создание, поиск, редактирование, видимость, зависимости и безопасное удаление месторождений.', estimatedMinutes: 5, steps: uniqueSteps([geobase]) },
  { id: 'geology-well', title: 'Карточка скважины', description: 'Все вкладки WELL-1042: паспорт, глубины, литология, ГИС, пробы, документы и аудит.', estimatedMinutes: 18, steps: uniqueSteps([wellOverview, passportAndDrilling, lithologyAndSamples, logsAndInterpretation, outputsAndAudit]) },
  { id: 'geology-logs', title: 'ГИС и интерпретация', description: 'Импорт, QC, viewer, интервалы, AI и экспертное решение.', estimatedMinutes: 9, steps: uniqueSteps([logsAndInterpretation, projectsAndPublication.slice(0, 3)]) },
  { id: 'geology-projects', title: 'Разрезы, запасы и публикация', description: 'SectionProject, методы запасов, review и передача exact versions.', estimatedMinutes: 11, steps: uniqueSteps([projectsAndPublication]) },
  { id: 'geology-methods', title: 'Справочники и методики', description: 'Master data, формулы, кондиции, шаблоны и ограничения прототипа.', estimatedMinutes: 8, steps: uniqueSteps([masterAndMethods]) },
]

export const geologyTourDefinitionById = new Map(geologyTourDefinitions.map((tour) => [tour.id, tour]))

export const geologyTourCoveredRoutes = [...new Set(geologyTourDefinitions[0]!.steps.map((item) => item.route))]
