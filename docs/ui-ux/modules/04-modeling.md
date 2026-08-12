# Модуль моделирования

## 1. Цель

Дать геотехнологу управляемую среду подготовки, запуска, анализа и публикации расчётных сценариев. Каждый результат должен быть воспроизводим: известны версия входных данных, параметры, вычислительный компонент, журнал и автор решения.

## 2. Роли

- **R4 Геотехнолог-моделист:** проект, сетка, параметры, сценарии, запуск и анализ.
- **R5 Прикладной эксперт/гидрогеохимик:** физико-химические параметры, проверка и валидация.
- **R6 Технолог:** предоставляет режимы, просматривает/комментирует результаты.
- **R12 Руководитель:** согласует публикацию по workflow.
- **R11 Аналитик:** читает опубликованные результаты в ЭАМ.
- **R13:** инфраструктурные jobs/интеграции, без предметной правки модели.

## 3. Навигация

1. Проекты;
2. Мои расчёты;
3. Опубликованные результаты;
4. Сравнения;
5. Библиотека параметров/шаблонов — если разрешена;
6. Задачи валидации.

Внутри проекта основная навигация — дерево объектов, вкладки workspace и inspector.

## 4. Сущности

`ModelProject`, `InputSnapshot`, `ModelDomain`, `Grid`, `GridCell`, `Block`, `Array`, `Field`, `InterpolationConfig`, `ModelWell`, `WellRegime`, `PhysicalChemicalParameterSet`, `InitialCondition`, `BoundaryCondition`, `Scenario`, `Run`, `RunStage`, `RunLog`, `ResultField`, `ResultSeries`, `ValidationSet`, `Publication`.

## 5. Реестр проектов

Карточка/строка показывает:

- участок/scope;
- владелец и команда;
- базовая версия входов;
- активный сценарий;
- последний run/status;
- quality/stale;
- опубликованная версия;
- изменено/продолжить.

Фильтры: scope, status, owner, дата, модель/версия, stale, published. Быстрые действия: открыть, клонировать, создать сценарий, запустить разрешённый preflight, архивировать draft.

## 6. Создание проекта

Wizard:

1. scope и назначение;
2. опубликованная версия геологии/запасов;
3. технологические данные и период;
4. шаблон/пустой проект;
5. команда и права;
6. summary входов, warnings и создание snapshot.

Нельзя публиковать проект на неутверждённых входах. Для exploratory draft это возможно только с заметной маркировкой `НЕ ДЛЯ ПУБЛИКАЦИИ`.

## 7. Рабочая область проекта

### Компоновка

- toolbar: save, undo/redo, scenario, validate, run;
- слева ModelTree;
- центр: 2D plan/grid/map или график;
- справа inspector выбранного узла;
- снизу issues/log/series;
- header: project, input snapshot, scenario, status, stale.

### ModelTree

Группы: domain, grid, blocks/cells, arrays/fields, wells/regimes, parameter sets, conditions, scenarios, runs, results. Поддерживаются visibility, lock, status, context menu и search. Drag/drop допускается только для разрешённой организации элементов и проходит validation.

## 8. Область и сетка

### Domain

Выбор/редактирование контура, вертикального диапазона, CRS и исключений. Геометрия валидируется до построения сетки.

### Grid

- тип/размер/ориентация;
- число ячеек и оценка ресурса;
- refine/coarsen regions, если scope подтверждён;
- preview до materialize;
- invalid cells и boundary;
- version/diff.

UI показывает влияние параметра до запуска: количество ячеек, примерный объём данных и предупреждение о тяжёлом сценарии. Реальная оценка приходит backend; demo использует маркированную эвристику.

## 9. Массивы, поля и интерполяция

`Field` имеет quantity, unit, dimensions, source, method, coverage, no-data policy и version. Представления:

- карта/heatmap;
- histogram/statistics;
- таблица значений selection;
- source points;
- quality mask.

Wizard интерполяции:

1. source dataset/version;
2. variable/unit;
3. domain/mask;
4. method и parameters;
5. cross-validation preview;
6. run as background job;
7. review field/quality;
8. accept as project version.

Реальная геостатистика не реализуется в UI-прототипе; demo result детерминирован и помечен.

## 10. Скважины и режимы

Таблица, карта и timeline синхронны. Для скважины:

- роль в модели;
- связь с published object;
- интервал/экран;
- режим по времени;
- расход/давление/состав;
- источник fact/plan;
- gaps/conflicts.

Редактор режима поддерживает интервалы времени, copy/paste, batch shift и comparison с фактом. Overlap, отрицательная длительность, несовместимая unit и режим вне жизни скважины — errors.

## 11. Физико-химические параметры

ParameterSet:

- имя/версия/владелец;
- область применимости;
- таблица quantity/value/unit/source/uncertainty;
- зависимость от температуры/состава, если применимо;
- ссылка на документ/эксперимент;
- статус R5 review.

Изменение утверждённого набора создаёт новую версию и помечает сценарии stale. Copy from library не разрывает provenance.

## 12. Условия

Initial/BoundaryCondition editor показывает spatial selection, time validity, value/expression, unit и source. Формула имеет syntax validation и preview на выбранных точках. Конфликт условий выявляется preflight и ведёт к точным объектам.

## 13. Сценарии

Сценарий — набор overrides над базовой версией, а не полная копия без истории.

Возможности:

- clone base/current;
- rename/description/hypothesis;
- change log;
- parameter diff;
- tags `base`, `optimistic`, `conservative`, `experimental`;
- lock input version;
- archive;
- compare readiness.

UI различает изменения inputs, model config и visualization settings; последние не создают новый scientific scenario.

## 14. Предрасчётная проверка

Категории:

- geometry/grid;
- missing field/coverage;
- unit/dimension;
- well mapping/regime;
- initial/boundary conflict;
- parameter approval;
- stale/unpublished input;
- resource estimate.

Errors блокируют run. Warnings требуют acknowledgement и комментарий по policy. Issue имеет ссылку `Перейти и исправить`; selection сохраняется.

## 15. Запуск и мониторинг

Run state machine:

`Draft → Queued → Preparing → Running → Post-processing → Succeeded/Failed/Cancelled`

Экран:

- immutable summary scenario/input/component;
- queue position;
- stages и progress;
- elapsed/estimated time, если доступно;
- resource metadata;
- structured events и raw log по permission;
- cancel/retry/clone actions;
- notifications.

UI не показывает ложный процент. Если backend сообщает только stage, используется indeterminate progress и список этапов.

### Ошибка

Показать failing stage, human-readable problem, affected config, request/run ID, safe log excerpt и действия: открыть параметр, скачать diagnostic, clone fixed scenario, retry if idempotent. Изменение run запрещено.

## 16. Результаты

### Карта поля

Time step, depth/layer, quantity, unit, color scale, no-data, min/max/percentile clip, selection. Legend фиксируется при сравнении, чтобы цвета были сопоставимы.

### Профиль/разрез

Трасса, вертикальный масштаб, field, time, well overlay, cursor. Связан с map selection.

### Временной график

Точка/cell/well/block series, fact overlay, gaps, confidence/uncertainty, events. Экспорт содержит metadata.

## 17. Сравнение и валидация

### Scenario compare

- parameter diff;
- общая карта с locked scale;
- delta map;
- KPI table;
- time series;
- selected objects;
- costs/risks only if source defined.

Сравнение несовместимых quantities/grids предупреждает и показывает метод приведения.

### Fact validation

Выбрать fact dataset/version/period, сопоставить объект/показатель, рассчитать demo-metrics, изучить residual map/time series и оформить заключение R4/R5. Реальные критерии и пороги — OPEN.

## 18. Публикация

Условия:

- run succeeded;
- input snapshot валиден;
- mandatory validation выполнена;
- warnings acknowledged;
- reviewer/approver определены;
- описание назначения и ограничений заполнено.

Publication содержит immutable run link, version, effective period, approved by/date и consumer list. Отзыв не удаляет результат; ЭАМ видит withdrawn status и предлагает замену.

## 19. Межмодульные связи

- inputs: ГЕО published versions, ТЕХ regimes/measurements, dictionaries/norms;
- feedback: data issue может создать задачу в ГЕО/ТЕХ;
- outputs: published result fields/series → ЭАМ;
- stale event: новая входная версия уведомляет владельца;
- R12 сравнивает модель и факт через ЭАМ, не редактируя проект.

## 20. Demo-срез

#### Состояние интерактивного прототипа

Реализован путь `/modeling` → `/modeling/workspace/:projectId` → `/modeling/run/:projectId` → `/modeling/results/:projectId`, а также `/modeling/compare`: проект создаётся из опубликованных GEO/TECH snapshot, workspace показывает состав и preflight, run — этапы и журнал, result — карту/KPI/публикацию, compare — diff BASE-01 и ALT-02. Все расчёты и публикации являются прозрачной demo-сессией; solver, хранилище результатов и реальный экспорт не подключены.

Проект `MODEL-SITE-NORTH-BASE`:

1. создать сценарий `Пониженная закачка` от base;
2. изменить режим `WELL-1042`;
3. preflight обнаруживает одну несовместимую unit;
4. исправить и запустить;
5. job проходит stages, notification завершает;
6. сравнить base/variant по locked scale;
7. fact validation показывает улучшение одного показателя и ухудшение другого;
8. R5 добавляет conclusion;
9. R12 утверждает публикацию;
10. AN-10 открывает конкретный published run.

Дополнительный `SCN-09` падает на boundary condition и демонстрирует диагностику/clone-retry.

## 21. Acceptance

- project всегда показывает input snapshot/scenario/status;
- tree/canvas/inspector синхронны;
- fields имеют quantity/unit/source/coverage;
- preflight issue ведёт к исправляемому месту;
- run immutable и не блокирует навигацию;
- failed run диагностируем и клонируем;
- compare использует сопоставимые шкалы;
- fact/model визуально различимы;
- публикация доступна только после проверок;
- ЭАМ ссылается на точный run/version.
