# Текущая реализация и gap-анализ

## 1. Базовая оценка

Текущий React-прототип — полезный UX-каркас, но не функциональный эквивалент руководства. Он демонстрирует часть главного пользовательского пути на детерминированных synthetic-данных и хранит изменения в памяти браузера. Реальных parser, database persistence, calculation engine, GIS topology, report renderer и 2D/3D geological model backend нет.

Оценка покрытия относится к поведению, а не к наличию похожего заголовка:

- **Demo-covered** — есть проверяемое интерактивное действие, но без production backend;
- **Partial** — показана только малая часть предметной операции;
- **Placeholder** — route/tab есть, но целевого результата нет;
- **Absent** — рабочая область и доменная модель отсутствуют.

## 2. Фактическая техническая база

| Область | Сейчас | Следствие |
|---|---|---|
| Router | маршруты `/geology`, `/geology/map`, `/geology/wells`, `/geology/wells/new`, карточка скважины, compare, correlation, reserves, delivery | большая часть каталога GEO-02–33 не имеет самостоятельного route/state contract |
| Repository | для паспорта/конструкции введены typed contracts, demo/HTTP adapters и compatibility API; остальные области остаются функциями над in-memory arrays/maps | repository seam доказан одним vertical slice, но persistence, server validation и миграция остальных агрегатов ещё не выполнены |
| Well domain | упрощённые `Well`, construction, drilling run, core box, geological interval, sample, lab result, log run | типы не способны представить руководство без несовместимых расширений |
| Dictionaries | несколько строковых union-типов: 5 пород, 4 индекса, GR/SP/RES | нет версий, даты действия, единиц, локализации и администрирования |
| Spatial | CSS/synthetic map и hard-coded схемы; добавлен общий CRS-aware Point/LineString/Polygon foundation и versioned passport point | нет утверждённого CRS transform adapter, геометрии ствола, clipping, snapping, spatial storage/query и vector export |
| Calculations | простые синхронные формулы на клиенте | результат не воспроизводим и не пригоден для предметного утверждения |
| State | browser session/demo memory | refresh/concurrent user теряют или конфликтуют с состоянием |
| Audit | паспорт создаёт typed append-only demo event с actor/request/before/after hash; остальные записи демонстрационные | нет серверного immutable audit и полного покрытия команд |

## 3. Gap по функциональным областям

### 3.1. Платформа геологических данных

| Возможность | Покрытие | Что есть | Что требуется | Решение |
|---|---|---|---|---|
| Месторождения, залежи, участки | Placeholder | фильтр по участку и synthetic scope | CRUD, immutable ID, связи, версии, permissions | **ADD** GEO-02 как полноценный registry/card |
| Кондиции и лимиты | Absent | отдельные константы в demo-формах | versioned condition sets, effective date, impact, approval | **ADD** в GEO-02 + admin dictionary |
| Единицы и quantities | Demo-covered foundation | canonical registry, conversions, qualifiers/missing/uncertainty/ranges; GEO-11 использует compatible units | расширить catalog, versioned definitions и backend contracts на все измерения | **KEEP + EXTEND** GEOX-E01-T05 |
| Provenance | Partial | source labels на части экранов | source record для каждого измерения/интервала/расчёта | **EXTEND** общий Evidence/Source layer |
| Версии и зависимости | Demo-covered для паспорта/конструкции | независимые versions, expectedVersion conflict, idempotency, impact и stale records | распространить repository/graph на интервалы, ГИС, разрезы, запасы и модели; подключить persistence | **KEEP + EXTEND** GEOX-E01 |
| Удаление | Partial | локальное удаление некоторых строк | archive/soft delete, dependency check, reason, audit | **REPLACE** прямой delete доменными командами |

### 3.2. Скважина и первичные данные

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Реестр и карта | Demo-covered | URL-фильтры, cross-selection, layers | расширенные фильтры, completeness, spatial engine, profiles/blocks | **KEEP + EXTEND** |
| Wizard скважины | Partial | код, назначение, XY/CRS, глубина, базовая конструкция | залежь/профиль/блок, отметки Z, даты, бурение, освоение, геология, duplicate spatial check | **EXTEND** |
| Паспорт | Partial | назначение, координаты, глубина | четыре legacy-раздела, ответственные, история глубин, основной survey | **RESTRUCTURE** в nested tabs |
| Конструкция | Partial | один тип интервальной таблицы | типовые элементы, внутренний/внешний диаметр, точечный узел, overlapping by type | **REPLACE** generalized interval-only schema |
| Бурение | Partial | `from/to`, полученная длина, способ | журнал/скорректированный диапазон, диаметр, инструмент, агент, project/log/logging depths | **EXTEND** |
| Керновые коробки | Demo-covered | interval, storage, photos, samples, description | связь с рейсом/материалом, barcode, chain of custody, media service | **EXTEND** |
| Промер керна | Absent | — | два depth domains, 0.1m bins, merge/rebin, missing measurement | **ADD** |
| Инклинометрия | Absent | только статические устье/забой | survey sets, points, main flag, import, trajectory calculate/export | **ADD** |
| Геометрия ствола | Absent | прямая схема | calculated trajectory, measured depth ↔ XYZ/elevation mapping | **ADD** shared well trajectory service |

### 3.3. Литология, стратиграфия и керновая интерпретация

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Интервальный редактор | Demo-covered foundation | GEO-09 использует generalized policies/commands/diff/undo/redo вместо lithology-only helpers | version conflict, effective dictionaries, keyboard table parity; миграция остальных track types | **KEEP + EXTEND** GEOX-E01-T06 |
| Три литологические колонки | Absent | один общий track | core/log/composite, provenance, compare/accept | **REFACTOR** data model |
| Порода/цвет/минерализации | Partial | одна порода + текст | sets, dictionary IDs, free description, overrides | **EXTEND** |
| Стратиграфия | Partial | поле в общем интервале | отдельный track, independent rules, shift/copy | **SPLIT** в отдельную сущность |
| Описания паспорт/колонка | Absent | — | inherited grouped overrides | **ADD** presentation annotations |
| Интерпретатор керна | Absent | — | depth mapping, reorder/reverse/stretch, no-core, linked samples/measurement | **ADD** отдельный professional workspace |
| Проверка согласованности керна | Partial | overlap/gap/depth | recovery vs lithology, samples vs no-core, source mapping | **EXTEND** domain validator |

### 3.4. ГИС, преобразования и интерпретация

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Реестр наборов | Demo-covered | диапазон, шаг, GR/SP/RES, QC status | все curve families, tool/run metadata, raw file/version | **EXTEND** |
| Импорт | Partial | четырёхшаговый synthetic LAS/DAT wizard | реальный parser, dialect profiles, encoding, multi-run, overwrite diff, protocol | **REPLACE** demo importer backend job |
| QC | Partial | один gap issue | null/gap/spike/out-of-range/depth/unit/calibration, acknowledgement | **EXTEND** rule engine |
| LogViewer | Demo-covered | ruler, lithology, three curves, cursor/inspector | arbitrary tracks, scale/log, multi-run overlay, comments, virtualized rendering | **KEEP + REBUILD renderer** |
| Формульный пересчёт | Absent | — | typed expression, range, preview, derived curve provenance | **ADD** |
| Объединение кривых | Absent | — | range/priority/depth/amplitude/zero, preview and source graph | **ADD** |
| Инклинометрия import | Absent | — | station profile and replacement protocol | **ADD** shared import framework |
| Ручная интерпретация | Partial | один interval, category, confidence, reason | multiple methods/tracks, calculated properties, drafts, review | **EXTEND** |
| AI compare | Demo-covered | hard-coded conflict and decision | real input versions, interval diff, thresholds, audit, permissions | **KEEP UX + REPLACE data** |
| Технологические интервалы | Absent | — | manual/automatic КС methods, preview, min thickness | **ADD** |
| Фильтрация | Absent | — | filtration properties and provenance | **ADD** |
| Рудные интервалы | Absent | only generic manual category | differential/direct modes, composites, GammaZ adapter | **ADD** |

### 3.5. Пробы и лаборатория

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Реестр проб | Demo-covered | core/control/blank/duplicate, interval, status | multi-interval sample, four legacy families, two depth domains | **EXTEND** |
| Параметры и результаты | Partial | single flat result | method/version, qualifiers, detection limits, laboratory, request | **EXTEND** |
| QA/QC | Partial | accepted/review/rejected | batch, repeatability, control rules, exceptions, lineage | **EXTEND** |
| Гранулометрия | Absent | — | fractions, sums/losses, histogram/cumulative, d60/d10 | **ADD** |
| LIMS | Absent | — | import/export/status contract and reconciliation | **ADD** adapter after domain completion |

### 3.6. Колонки, документы, отчёты и карта

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Шаблон колонки | Partial | 3 static templates and track visibility | arbitrary tracks/scales/ranges/styles/labels/level lines | **REPLACE** hard-coded templates with persisted schema |
| Профессиональная колонка | Partial | simplified depth strip | horizon/full bore, construction, samples, ore, inspector, split view | **REBUILD** vector scene |
| Легенда | Absent | — | generated by base/deposit/drawing, grouping and ID | **ADD** |
| Документы | Placeholder | tab exists | object storage, metadata, versions, permissions, virus scan | **ADD** platform document feature |
| Reports | Placeholder | decorative PDF link | server templates, snapshot, jobs, PDF/XLSX/SVG/DXF | **REPLACE** |
| Multi-page preview | Absent | — | pages, crop, fields, rotation, overlap and selection | **ADD** report preview |
| Карта | Partial | synthetic map/layers | real geometry, CRS, measurement, edit, snap, profile/block overlays | **REPLACE** canvas with spatial engine |
| User SQL | Absent | correctly absent | saved view/filter/style alternative | **DO NOT ADD** raw SQL; add admin-managed views |

### 3.7. Геотехнологические разрезы

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Correlation view | Partial | hard-coded 3 wells/4 horizons | persisted SectionProject and input snapshot | **REPLACE** demo fixture with domain data |
| Route editor | Absent | — | polyline segments, LSQ fit, reverse/reorder, corridor | **ADD** GEO-23 |
| Well selection | Partial | fixed wells | include/exclude, order, use-by-surface | **ADD** |
| Tech horizons | Absent | generic horizon lines | interval connectivity, pinch-out, helper intervals, repair | **ADD** GEO-24 |
| Rhythm packages/foundation | Absent | — | dictionaries, roof/base from contour segments | **ADD** |
| Ore body | Absent | — | balance/off-balance/preliminary contours | **ADD** GEO-25 |
| Oxidation zone | Absent | — | multi-polyline editor and snapping | **ADD** |
| Drawing variants | Absent | — | plan/section/tables/stamp/layout versions | **ADD** |

### 3.8. Запасы

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Project | Partial | one static page | stages, ore packages, source snapshot, registry | **REPLACE** with ReserveProject |
| Inputs | Partial | area/thickness/density/grade | intersections, effective thickness, contours, wells, conditions | **REBUILD** |
| Contour/block editor | Absent | — | balance/off-balance polygons, cells, snapping, topology | **ADD** GEO-29 |
| Ore intersections | Absent | — | profile workflow and effective interval alignment | **ADD** |
| Projection method | Simplified | one arithmetic formula | network averaging, ore ratio, hurricane cuts, full outputs | **REPLACE** |
| Voronoi | Absent | — | clipped cells and aggregation | **ADD** |
| Interval registry | Absent | — | balance/tech off-balance calculation | **ADD** |
| Geostatistical method | Absent | — | accepted field snapshot and mesh integration | **ADD** |
| Method history/compare | Absent | — | versioned runs, one active, compare/approve | **ADD** |
| Reserve plan | Absent | — | layers, styles, labels, isolines, export/print | **ADD** |
| Approval/delivery | Partial | demo submit/publish toggles | workflow, reauth, signatures placeholder, immutable package | **EXTEND** common workflow |

### 3.9. 2D/3D геологическое моделирование

| Возможность | Покрытие | Что есть | Gap | Действие |
|---|---|---|---|---|
| Modeling shell | Demo-covered in `/modeling` | project/workspace/preflight/run/result/compare | geology-specific domain objects and scientific editors | **REUSE** modeling shell |
| Domain/mesh | Placeholder/demo | summary cards | geometry editor, breaklines, nested refinement, mesh materialization | **EXTEND MOD-05** |
| Source data analysis | Absent | — | source points, histogram, exclusions, support objects | **ADD to MOD-07** |
| Variography | Absent | — | cloud, directions, model fit, cross-validation | **ADD to MOD-07** |
| Interpolation | Placeholder | synthetic result only | methods, search config, field jobs, metrics | **REPLACE** synthetic engine |
| 2D geological environment | Absent | — | accepted fields, thresholds, ore contours, reserve handoff | **ADD** geology workflow over MOD results |
| Horizons/surfaces | Absent | — | intersections, roof/thickness fields | **ADD MOD-05/06** |
| 3D mesh | Absent | — | prism grid, inspect, validation | **ADD MOD-05** |
| 3D distributions/DGM | Absent | — | horizon groups, 3D variography/search, accepted composition | **ADD MOD-06/07/16/17** |
| 3D rendering | Partial synthetic | simple demo result map, no geological volume | isosurfaces, slices, section planes, GPU fallback | **ADD shared renderer** |

## 4. Что сохранить из текущего прототипа

Нельзя начинать расширение с полной переписи. Сохраняются:

- app shell, permission-aware routing и контекст scope;
- semantic design tokens и базовый UI-kit;
- единая карточка скважины как контейнер;
- URL-state для вкладки, фильтра, selection и compare;
- синхронизация table/track/inspector в литологии, бурении, карте и LogViewer;
- depth interval validation primitives как начало общей библиотеки;
- паттерны impact preview, обязательной причины и expert resolution;
- transparent synthetic marking до подключения production backend;
- modeling job/run UX как основа тяжёлых геологических расчётов.

## 5. Что нужно удалить или заменить

| Текущая конструкция | Причина | Замена |
|---|---|---|
| hard-coded wells/curves/sections/reserves внутри page components | нельзя версионировать и проверять | repositories + typed API contracts + fixtures |
| flat `WellGeologyData` с одним типом интервала | смешивает независимые треки | отдельные aggregate/entity types |
| union из 5 пород и 4 стратиграфических кодов | не масштабируется и не имеет даты действия | versioned dictionaries by ID |
| `LogRun.curves` только GR/SP/RES | не представляет реальные наборы/значения | `LogCurve` metadata + chunked samples |
| instant reserve arithmetic in UI | не имеет snapshot/метода/audit | background `ReserveCalculationRun` |
| CSS pseudo-map and hard-coded correlation | нет геометрической истинности | shared spatial/section scene engine |
| decorative PDF/download and publication | вводит пользователя в заблуждение | actual export job + package record |
| route eyebrow labels GEO-20/21/22 | расходятся с canonical catalog | GEO-22/24, GEO-27–30, GEO-34 |

## 6. Риски интеграции

| Риск | Проявление | Снижение |
|---|---|---|
| расширить старый `Well` до «бога-объекта» | огромные payload, конфликты, повторные renders | отдельные aggregates и query keys по workspace |
| считать всё синхронно в браузере | зависание, невоспроизводимость | worker только для preview; authoritative jobs на backend |
| смешать visual settings с scientific version | новый scientific result при смене цвета | отдельные `ViewTemplate`/`SceneLayout` |
| дублировать mesh/variography в GEO и MOD | несовместимые результаты | единый computational/modeling service |
| автоматически пересчитывать downstream | потеря утверждённой базы | stale marker + explicit rerun/accept |
| копировать контекстные меню legacy | скрытые операции и a11y gap | toolbar + menu + shortcuts + command hints |
| реализовать OCR-формулы напрямую | математическая ошибка | ручная formula specification и независимые golden tests |

## 7. Итоговая оценка готовности

| Слой | Оценка |
|---|---|
| UX foundation | пригоден для расширения |
| Скважинный demo-процесс | частично пригоден, требует новой domain model |
| ГИС viewer/AI compare | UX-паттерн пригоден, данные и engine под замену |
| Разрезы | только концептуальная демонстрация |
| Запасы | только концептуальная демонстрация |
| 2D/3D | общий modeling shell есть, геологической реализации нет |
| Production readiness | отсутствует: backend, persistence, compute, storage, audit и integrations не реализованы |
