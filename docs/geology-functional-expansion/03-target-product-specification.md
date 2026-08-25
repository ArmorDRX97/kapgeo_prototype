# Целевая продуктовая спецификация геологического контура

## 1. Цель и границы

Целевой результат — единый web-процесс подготовки, проверки, расчёта и публикации геологической основы, покрывающий весь функциональный объём руководства, но соответствующий архитектуре, ролям, дизайну и политикам AI KAPGEO.

Геологический контур заканчивается не «нарисованным экраном», а опубликованным immutable package, содержащим:

- версии месторождения/кондиций;
- версии скважин и первичных данных;
- утверждённые интерпретации;
- разрезы, рудные тела и пересечения;
- проекты и результаты запасов;
- при наличии — принятые 2D/3D geological fields/DGM;
- provenance, ограничения, approvals и consumer list.

## 2. Принципы целевого UX

1. **Object-first:** пользователь работает с месторождением, скважиной, разрезом, блоком или моделью, а не с отдельным desktop-приложением.
2. **Версия до расчёта:** каждый расчёт фиксирует immutable input snapshot.
3. **Draft отдельно от published:** изменение утверждённого создаёт новую версию.
4. **No silent cascade:** downstream становится `stale`; пересчёт выполняется явно.
5. **Table + canvas parity:** всё, что можно изменить мышью на научном полотне, имеет доступный табличный/формовый эквивалент.
6. **Selection everywhere:** карта, таблица, колонка, профиль, 3D и inspector используют единый selection context.
7. **Missing is data:** отсутствующее измерение, ноль, значение ниже предела и неописанный интервал различаются.
8. **AI is separate:** AI-результат не смешивается с ручным и не публикуется без человека.
9. **Scientific vs visual settings:** цвет/масштаб/компоновка не создают новую научную версию; изменение входов/метода создаёт.
10. **Long work is a job:** import, mesh, interpolation, reserve calculation, report and export не блокируют навигацию.

## 3. Роли и permissions

Роль используется для стартового набора, но доступ вычисляется как `permission + scope + object status`.

| Permission | Типичный владелец | Назначение |
|---|---|---|
| `geo.deposit.read/manage` | R1/R13 | месторождения, залежи, участки |
| `geo.conditions.read/edit/approve` | R1/R3/R12 | кондиции, поправки, пороги |
| `geo.well.create/edit/publish` | R1/R12 | паспорт и первичные данные |
| `geo.survey.import/edit/approve` | R2/R12 | ГИС и инклинометрия |
| `geo.curve.transform` | R2 | derived/merged curves |
| `geo.core.interpret` | R1 | керновая привязка и сводная колонка |
| `geo.sample.manage` | R1 | пробы и отбор |
| `geo.lab.review` | R1/R2 | результаты/QA/QC |
| `geo.interpret.manual` | R1/R2 | литология, tech/ore intervals |
| `geo.interpret.ai.review` | R1/R2 | сравнение и resolution |
| `geo.section.edit/approve` | R1/R12 | разрезы, горизонты, рудные тела |
| `geo.reserve.edit/calculate` | R3 | пересечения, блоки, методы |
| `geo.reserve.approve` | R12 + scope | утверждение запасов |
| `geo.model.prepare/run/review` | R1/R3/R4/R5 | geological 2D/3D workflows |
| `geo.report.generate` | R1/R2/R3 | отчёты и приложения |
| `geo.export.sensitive` | по policy | координаты/векторные/массовые данные |
| `geo.publication.manage` | R12 | публикация/отзыв пакета |

Разрешение edit снимается в состояниях `In review`, `Approved`, `Published`, кроме специально разрешённого return/revoke workflow.

## 4. Сквозной целевой процесс

### Этап A. Подготовка контекста

1. Выбрать organization/deposit/site и `asOf`.
2. Проверить действующий набор кондиций, CRS и справочников.
3. Создать/выбрать geological working version.
4. Система показывает полноту источников, открытые data issues и устаревшие downstream-объекты.

### Этап B. Скважина и первичные данные

1. Создать draft скважины или новую версию опубликованной.
2. Заполнить паспорт, геометрию, проходку, освоение, геологию и конструкцию.
3. Импортировать/ввести инклинометрию, ГИС, керновые рейсы, промер и пробы.
4. Исправить errors, подтвердить warnings и выбрать основные наборы.
5. Отправить well version на review и опубликовать.

### Этап C. Интерпретация

1. Создать interpretation workspace на конкретном input snapshot.
2. Сформировать core/log/composite lithology, stratigraphy, permeable/filtration intervals.
3. Создать ore/differential/composite intervals и sample alignment.
4. При наличии AI выполнить compare/resolution.
5. Утвердить interpretation version.

### Этап D. Колонка и разрез

1. Сформировать профессиональную колонку/паспорт по template.
2. Создать SectionProject и input snapshot скважин.
3. Задать profile route и включённые скважины.
4. Построить connectivity технологических горизонтов, rhythm packages/foundation.
5. Построить ore bodies, off-balance bodies и oxidation zones.
6. Проверить topology и опубликовать section version/drawing.

### Этап E. Запасы

1. Создать ReserveProject для стадии, залежи и ore package.
2. Определить ore intersections/effective thickness.
3. Создать balance/off-balance block или technological polygon/cells.
4. Зафиксировать условия, учитываемые и сетевые скважины.
5. Выполнить один или несколько расчётов.
6. Сравнить методы, выбрать active result, оформить reserve plan/passport.
7. Review/approve/publish.

### Этап F. 2D/3D геологическая модель

1. Из GEO создать ModelProject с geological input snapshot.
2. Определить data/grid domains, скважины, horizons/breaklines.
3. Построить/проверить mesh.
4. Проанализировать данные, вариограммы и cross-validation.
5. Выполнить field runs, принять распределения.
6. Сформировать 2D geological environment или 3D DGM.
7. Передать accepted result в GEO review; не заменять published geology автоматически.

### Этап G. Публикация

1. Система проверяет approved dependencies и отсутствие blocking stale/error.
2. Автор выбирает состав package, effective date, consumers и ограничения.
3. Reviewer/approver выполняет решение с обязательной причиной.
4. Package публикуется в technology/modeling/analytics.
5. Отзыв не удаляет версию и указывает replacement.

## 5. Целевые сущности и состояния

### 5.1. Общие состояния версионируемого объекта

`Draft → Validating → Ready for review → In review → Changes requested/Approved → Published → Superseded/Withdrawn`.

Дополнительные orthogonal flags:

- `quality: unknown/warning/error/passed`;
- `freshness: current/stale`;
- `completeness: percentage + missing mandatory groups`;
- `lock: editable/read-only/system-locked`.

### 5.2. Import job

`Created → Uploading → Parsing → Mapping → Validating → Awaiting confirmation → Applying → Succeeded/Partially succeeded/Failed/Cancelled`.

До `Applying` существующие данные не изменяются. Apply создаёт новый source/version и протокол, а не перезаписывает опубликованный набор на месте.

### 5.3. Calculation run

`Draft → Preflight → Queued → Running → Post-processing → Succeeded/Failed/Cancelled → Reviewed → Accepted/Rejected → Superseded`.

Run immutable после `Queued`. Retry создаёт новый run со ссылкой `retryOf`.

### 5.4. Stale propagation

| Изменился объект | Зависимые объекты |
|---|---|
| coordinates/trajectory/depth | columns, sections, intersections, blocks, models, reports |
| log curve/main survey | interpretations, columns, ore intervals, sections, reserves |
| lithology/tech intervals | core composite, sections, ore bodies, models |
| ore composite | sections, reserve intersections, blocks, calculations |
| section route/connectivity | intersections, reserve project, drawings |
| condition set | classifications and reserve runs using it |
| accepted model field | geostatistical reserve runs and plans |

Stale не означает invalid: опубликованная версия остаётся воспроизводимой, но не считается актуальной для новой работы.

## 6. Рабочие области

### 6.1. GEO-01 Обзор

Показывает:

- incomplete wells by group;
- imports/QC issues;
- interpretations awaiting review;
- stale sections/reserve/model artifacts;
- active calculations/jobs;
- publications and withdrawals;
- role-specific next actions.

Каждый KPI ведёт в отфильтрованный registry, а не в статичную карточку.

### 6.2. GEO-02 Месторождения, залежи и кондиции

Состав:

- registry/tree deposits/sites/deposits lenses;
- card with immutable code, names, type, description, CRS and scopes;
- ore/rhythm package dictionaries;
- effective-dated ConditionSet versions;
- поправки азимута, плотность, balance/off-balance thresholds, hurricane criterion, geometry tolerances;
- impact preview и approval.

### 6.3. GEO-03/04 Карта и реестр скважин

Дополнить текущие фильтры:

- deposit/site/ore package/profile/block;
- purpose/type/status/version;
- total/measured depth;
- trajectory present;
- logs/core/samples/construction completeness;
- QC/interpretation/publication/stale.

Карта поддерживает CRS, real geometry, layer presets, selection, measure, bbox/corridor selection, well head/bottom/trajectory и read-only overlays section/block/model.

### 6.4. GEO-05/06 Карточка скважины

Целевые URL-вкладки:

| Вкладка | Содержание |
|---|---|
| `overview` | completeness, quality, versions, dependencies, tasks |
| `passport` | description, geometry, documentation people |
| `drilling` | drilling facts, diameter/tool/agent intervals, core runs |
| `completion` | development works, flow, construction |
| `geology` | permafrost, water, complications, impermeable intervals |
| `trajectory` | survey sets, import, calculation, XYZ/profile |
| `core` | runs, boxes, measurement, depth mapping |
| `lithology` | core/log/composite and stratigraphy |
| `technology` | permeable/filtration/ore intervals |
| `samples` | all sample families and results |
| `logs` | runs, curves, QC, viewer, transformations |
| `columns` | passport/full-bore layouts and exports |
| `documents` | files/reports |
| `versions` | diff, impact and workflow |
| `audit` | immutable trail |

### 6.5. Профессиональный depth workbench

Переиспользуется для lithology, core, logs, samples и intervals:

- header with well/input/version/draft;
- toolbar with add/split/merge/stretch/copy/shift/validate/save/undo/redo;
- left table or navigator;
- central synchronized depth canvas;
- right inspector/evidence;
- bottom issues/diff/history;
- common cursor, selection and zoom;
- track configuration as `ViewTemplate`.

### 6.6. ГИС и curve processing

Log registry и viewer должны поддержать произвольное количество curves. Для каждой curve обязательны mnemonic, canonical quantity, unit, sampling, null policy, source file, calibration, depth reference и version.

Curve transform:

1. выбрать source curve/version и диапазон;
2. ввести typed expression;
3. preview value/unit and diagnostics;
4. создать derived curve with lineage;
5. validation/review; original unchanged.

Curve merge:

1. выбрать curves одного compatible quantity;
2. настроить order, ranges, depth shift, multiplier, zero shift;
3. preview overlap and resulting coverage;
4. подтвердить deterministic priority;
5. создать merged curve and optionally nominate as main.

### 6.7. Core interpretation

Workspace показывает два depth domains, рейсы, core/no-core segments, lithology, measurement и sample tracks.

Обязательные операции:

- reorder/reverse run/segment;
- split/merge compatible segments;
- stretch with fixed roof/base;
- insert/remove no-core segment;
- restore deleted source segment;
- change composite lithology without changing source core description;
- create sample interval and map back to source core;
- reset draft to source mapping;
- diff and validation before save.

### 6.8. Tech/ore interval interpretation

Manual editor использует общие interval operations. Automatic KS interpretation сначала создаёт preview run с parameters and issues. Apply создаёт draft intervals, не публикует их.

Ore workbench разделяет:

- preliminary/no-correction result;
- differential intervals;
- interpreted ore intervals;
- ore composites;
- reserve intersections.

Каждый уровень имеет собственный provenance и не подменяет соседний.

### 6.9. GEO-19/20 Колонки и шаблоны

Vector scene должна уметь:

- horizon/full-bore documents;
- configurable track list/order/width;
- multiple curve instances, scales, range, line/marker styles;
- depth/elevation rulers, grid and level lines;
- lithology/mineralization/stratigraphy/construction/core/sample/ore tracks;
- value inspector and split-view;
- accessible table view;
- saved layout version, preview and export job;
- generated legend by drawing scope.

### 6.10. GEO-22–25 Разрезы

SectionProject имеет metadata, InputSnapshot, ProfileRoute, SectionWell list, vertical range и drawing variants.

Route editor:

- polyline segment CRUD;
- fit selected bottom points by least squares;
- margins, reverse, reorder, connect and snap;
- corridor selection and distance diagnostics;
- no hidden auto-change after well selection.

Section canvas:

- connectivity graph tech intervals across adjacent wells/boundaries;
- one-to-many interval connection;
- generated pinch-out with editable position;
- helper intervals explicitly marked `section-only`;
- contour control points, smoothing/straightening;
- rhythm roof/base and foundation;
- balance/off-balance/preliminary ore bodies;
- oxidation polylines;
- topology validation and auto-repair proposal, never silent publish.

### 6.11. GEO-27–33 Запасы

ReserveProject fields:

- scope/deposit/stage/ore package;
- section and well input versions;
- ConditionSet version;
- block/polygon geometry version;
- list of intersections;
- calculation runs;
- active result and approval status.

Intersection workbench combines profile and table. Effective thickness boundary can align to ore composite, permeable interval, filter, absolute elevation or explicit measured depth. Alignment rule is stored.

Block editor validates ring closure, self-intersection, holes policy, containment of selected wells/cells and CRS. Network wells are a distinct set from included wells.

Calculation methods are plugins with common contract:

- typed input schema and method version;
- preflight;
- immutable run;
- result table, spatial artifacts, warnings and diagnostics;
- compare-compatible summary;
- printable calculation protocol.

Required plugins: block projection, Voronoi, ore interval registry, geostatistical integration.

### 6.12. 2D geological modeling

Запускается из GEO, исполняется на MOD primitives. Обязательные views:

- project/input snapshot;
- data/grid geometry with breaks/axis;
- mesh preview/materialize/inspect;
- variable/source points/histogram/statistics;
- directional variogram cloud/model/cross-validation;
- interpolation method/search parameters/run;
- field review and accept;
- geological environment/ore contour;
- reserve handoff and visualization.

### 6.13. 3D geological modeling

Обязательные views:

- horizon dictionary/order;
- section-based picks and pinch-outs;
- roof/thickness surface runs;
- plan and prismatic volume mesh;
- horizon groups;
- source analysis/3D variography/search ellipsoid;
- accepted distributions by group/quantity;
- DGM composition tree;
- plan slices, averages/integrals, isosurfaces and section planes;
- versioned export.

## 7. Бизнес-правила и валидация

### 7.1. Интервалы

- numeric, finite `from < to`;
- common depth datum/unit;
- within applicable source/well range;
- overlap policy defined by track type;
- gap shown explicitly;
- edits snap only if snap rule enabled and visible;
- bulk action has preview and affected count;
- an interval cannot reference a source version not in its snapshot.

### 7.2. Geometry/topology

- CRS required for spatial data;
- closed rings, orientation and self-intersection validated;
- section route segments ordered and connected;
- contours cannot cross forbidden boundaries without explicit exception;
- 3D surfaces respect horizon order unless reviewed exception exists;
- helper geometry is labelled and excluded from scientific calculations by default.

### 7.3. Measurements

- quantity and unit required;
- qualifier/missing/null separated from numeric zero;
- conversion records original value/unit and rule version;
- out-of-range does not silently clamp;
- derived value stores expression/method/source versions.

### 7.4. Calculation

- formulas are server-side versioned definitions;
- all inputs serialized into hashable snapshot;
- deterministic seed recorded where stochastic behavior exists;
- result includes engine/component version and checksums;
- changed input never mutates prior result;
- warnings require acknowledgment according to policy;
- active result selection is explicit and audited.

## 8. URL and shareable context

Минимальные search parameters:

`org`, `deposit`, `site`, `asOf`, `version`, `view`, `selection`, `from`, `to`, `datum`, `scale`, `layers`, `method`, `runId`, `compare`, `issue`.

URL не хранит несохранённый scientific draft целиком, но восстанавливает объект, вкладку, выбранный интервал, viewport и inspector.

## 9. Состояния каждого route/workspace

Обязательны:

- loading/skeleton;
- empty with permitted create action;
- recoverable API error with request ID;
- forbidden with required permission/scope;
- read-only with reason;
- partial data and missing dependencies;
- stale input/result;
- validation errors/warnings;
- optimistic concurrency conflict with compare/reload/clone;
- background job queued/running/failed/succeeded;
- withdrawn/superseded publication.

## 10. Критерии продуктовой приёмки полного контура

- функция каждого раздела руководства имеет target route/workspace или осознанно заменена platform capability;
- пользователь проходит весь конвейер от скважины до публикации без внешнего desktop-приложения;
- изменения upstream формируют impact preview и stale events;
- все четыре reserve methods исполняются на versioned snapshots;
- 2D/3D results имеют cross-validation, provenance и review;
- научные данные не меняются при смене layout/style;
- source/manual/AI/accepted visibly different;
- ни одно действие в каталоге не является декоративным;
- отчёт/экспорт можно повторно скачать из immutable history;
- keyboard/table fallback покрывает canvas-only operations;
- RU/KZ/EN-ready labels используют полные message keys, без конкатенации фраз.
