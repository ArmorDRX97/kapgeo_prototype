# Экспертно-аналитический модуль

## 1. Цель

Объединить опубликованные геологические, технологические и модельные данные в среду анализа и управленческого решения: от обзора и интерактивного плана до объяснённого отклонения, рекомендации, принятого решения и профильной задачи.

ЭАМ не становится отдельным хранилищем ручных копий. Каждый показатель ссылается на источник, версию и временной срез.

## 2. Роли

- **R11 Аналитик:** выборки, карты, статистика, корреляции, отчёты.
- **R12 Руководитель:** обзор, паспорта, решение и согласование.
- **R6 Технолог:** технологическая аналитика и разбор отклонений.
- R1/R2/R3/R4/R5: профильный просмотр и комментарии по scope.
- R13: доступ/мониторинг, но не содержательное решение.

## 3. Навигация

1. Обзор;
2. Интерактивный план;
3. Динамика;
4. Выборки;
5. Корреляции;
6. Факт / модель / прогноз;
7. Отклонения;
8. Паспорта;
9. Отчёты;
10. Сохранённые виды.

## 4. Сущности

`MetricDefinition`, `MetricValue`, `ThematicLayer`, `SavedView`, `Selection`, `Analysis`, `CorrelationResult`, `Deviation`, `Hypothesis`, `Evidence`, `Recommendation`, `Decision`, `ActionTask`, `AnalyticalReport`.

`MetricValue` обязательно содержит quantity, value, unit, object, period/asOf, source, sourceVersion, quality и calculation status.

## 5. Аналитический обзор

Структура зависит от роли и scope:

- выбранный период/дата и свежесть;
- KPI с target/plan/fact/forecast;
- открытые существенные отклонения;
- проблемные кластеры на mini-map;
- принятые решения и эффект;
- качество/неполнота данных;
- model runs, требующие внимания;
- задачи и reports.

Правила KPI:

- название, единица и период видимы;
- цвет сравнивает с утверждённой целью/порогом;
- target version доступна;
- клик открывает точную выборку;
- `нет данных` не превращается в ноль;
- forecast/AI не смешиваются с fact.

## 6. Интерактивный план «на дату»

### Компоновка

- context + AsOfControl;
- карта;
- layer catalog/legend;
- фильтры и saved view;
- inspector;
- linked table/bottom panel;
- time playback при подтверждённой задаче.

### Слои

- технологические объекты/состояния;
- геологические показатели и контуры;
- производственные/химические метрики;
- оборудование/РВР;
- model result/forecast;
- отклонения/качество;
- пользовательская выборка.

Каждый слой сообщает source, version, effective time, unit, aggregation и no-data rule. Несопоставимые даты не накладываются без warning.

### Selection

Click, rectangle, polygon, spatial buffer, current filter и upload list of IDs. Selection показывает count и scope; большие выборки обрабатываются как background analysis. Карта/таблица/графики используют один selection contract.

## 7. Инспектор объекта

Краткий view без ухода со страницы:

- identity/status;
- current metric values;
- мини-графики;
- open deviations/tasks;
- data quality/freshness;
- fact/model delta;
- действия `Открыть паспорт`, `Добавить в выборку`, `Создать анализ`.

Inspector не дублирует полную карточку; deep link ведёт в OBJ/доменный экран и сохраняет возврат.

## 8. Динамика показателя

Пользователь выбирает metric, objects/aggregation, period и comparison. График поддерживает:

- единый/dual axis только при осмысленных разных units;
- events overlay: изменения режима, РВР, версия модели, data gap;
- plan/fact/model/forecast styles;
- range selection;
- anomaly markers;
- table alternative;
- data provenance по точке.

Автомасштаб не должен преувеличивать малое отклонение; baseline/zero и scale доступны в legend/settings.

## 9. Конструктор выборки

Шаги/панели:

1. universe: scope/type/date;
2. spatial condition;
3. attribute/metric conditions;
4. relation condition: блок/ячейка/оборудование/РВР;
5. preview count and exclusions;
6. fields and aggregation;
7. save/run/share.

Условия представлены читаемым expression summary. Система различает `AND/OR`, empty и no-data. Пользователь может открыть, почему объект исключён.

## 10. Таблица, статистика и корреляции

### Таблица

Virtual grid, column presets, grouping, pivot-like summary (если подтверждено), unit-aware filters и export. Cell inspector показывает source/version/quality.

### Статистика

Количество, valid/missing, min/max, percentiles, mean/median, spread; метод и exclusions видимы. Прототипные статистики вычисляются детерминированно и тестируются.

### Визуализации

Histogram, box plot, scatter, time series, category bars. Пользователь выбирает подходящий тип из ограниченного списка; система не создаёт бессмысленные комбинации quantity/category.

### Корреляция

Matrix и scatter для выбранных показателей. Обязательно:

- sample size;
- missing/excluded;
- method;
- period/scope;
- warning `корреляция не доказывает причинность`;
- переход к точкам/outliers.

## 11. Факт / модель / прогноз

Требования:

- совместимые quantity/unit/time/object mapping;
- явный published run/version;
- fact source/version;
- forecast horizon;
- residual/delta;
- quality/confidence/uncertainty;
- map, table и series views;
- список непокрытых объектов.

Если grid/object aggregation различаются, UI показывает mapping method. Нельзя визуально соединять несопоставимые series.

## 12. Отклонения

### Создание

Отклонение может быть rule-based, AI-suggested или создано человеком. Поля:

- subject/scope/metric;
- period;
- observed fact и reference;
- magnitude/severity;
- data quality;
- rule/model/source;
- owner/status;
- evidence links.

### Разбор

Workspace:

- summary и timeline;
- linked map/series;
- quality check;
- events before/after;
- связанные wells/blocks/equipment/RVR/model runs;
- hypotheses;
- evidence for/against;
- discussion/tasks.

Статусы: `New → Triaged → Investigating → Recommendation ready → Decision → Monitoring → Resolved`, а также `Rejected/Invalid data`.

## 13. Рекомендация и решение

Recommendation содержит:

- предлагаемое действие;
- scope/objects;
- evidence;
- expected effect и окно оценки;
- риски/ограничения;
- model/AI involvement;
- author/reviewer;
- срок.

R12 выбирает accept/reject/request changes. Acceptance создаёт domain task с owner и due date. Исполнение не происходит в аналитике автоматически. Результат профильной задачи возвращается в deviation timeline; после окна оценки аналитик сравнивает эффект.

AI suggestion помечен и требует формулировки человека перед submission, если policy не определяет иначе.

## 14. Аналитический паспорт

Read-oriented карточка для R12:

- идентичность и карта;
- key fact/plan/model/forecast;
- тренды;
- запасы/геология summary;
- режим и баланс;
- оборудование/RVR;
- deviations/tasks;
- source freshness;
- документы и approved reports.

Паспорт использует единый OBJ, а не создаёт конкурирующую версию данных.

## 15. Сохранённые виды и отчёты

SavedView хранит context, asOf/period policy, layers, filters, columns, visualization, owner, visibility и version. При открытии динамического вида дата может быть `latest`; отчёт всегда фиксирует абсолютный snapshot.

Share options: private, team/scope, link to permitted users. Ссылка не расширяет доступ.

Report builder:

1. template;
2. snapshot/context;
3. sections/charts/tables;
4. comments/conclusions;
5. provenance appendix;
6. preview;
7. background generation;
8. review/publish.

## 16. Состояния и ошибки

- mixed freshness;
- missing source;
- stale model;
- withdrawn publication;
- incompatible unit/period;
- selection too large;
- partial aggregation;
- no data versus filtered out;
- access-restricted count;
- failed analysis/report job.

При restricted данных агрегат показывается только если policy разрешает его без раскрытия состава.

## 17. Межмодульные связи

- ГЕО: опубликованные слои, запасы, качество;
- ТЕХ: замеры, балансы, equipment/RVR, plan-fact;
- МОД: published fields/series/scenarios;
- выход: recommendation → task в доменный модуль;
- общий: tasks, reports, saved views, audit, notifications.

## 18. Demo-срез

#### Состояние интерактивного прототипа

`/analytics` показывает as-of карту BLK-07-12, KPI с provenance, linked selection и таблицу объектов; `/analytics/decision` раскрывает факт, план, модель и связанную РВР-гипотезу. Рекомендация создаёт demo-задачу в TECH только после явного принятия руководителем. Полноценные saved views, экспорт и production-источники остаются следующим слоем.

1. R11 открывает слой отклонения на `2026-08-09`;
2. spatial selection находит кластер из 8 скважин;
3. таблица показывает одну missing series и один low-quality source;
4. fact/model сравнение связывает gap с изменением режима и частичным РВР;
5. аналитик формирует две hypotheses и evidence;
6. recommendation предлагает повторную проверку режима у 3 скважин;
7. R12 принимает с сокращённым scope;
8. создаётся задача R6;
9. сохранённый view/report фиксирует исходный snapshot.

## 19. Acceptance

- as-of date видна и применяется ко всем panels;
- layer сообщает источник/версию/единицу;
- карта/таблица/график синхронизируют selection;
- no-data не считается нулём;
- fact/model/forecast/AI различимы;
- статистика сообщает sample/exclusions/method;
- recommendation содержит evidence и не исполняется сама;
- решение создаёт traceable domain task;
- report/saved view не расширяют access;
- stale/withdrawn source явно предупреждает пользователя.
