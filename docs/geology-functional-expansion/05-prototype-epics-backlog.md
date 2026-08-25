# GEOX — backlog кликабельного прототипа

## 1. Статус и границы

Этот документ является авторитетным implementation backlog для текущего этапа AI KAPGEO. Все 13 эпиков и 137 входящих в них задач поставляются как кликабельный демонстрационный web-прототип на React/TypeScript, публикуемый на GitHub Pages.

Руководство пользователя определяет полный состав предметных операций, но текущий этап не создаёт промышленную геологическую информационную систему. Production backend, реальные корпоративные интеграции, промышленная защита, юридическая ЭЦП, серверные вычислительные кластеры и гарантии больших объёмов не входят в Definition of Done этих эпиков.

Каждый результат обязан:

- использовать только детерминированные и явно synthetic данные;
- иметь рабочий route, доступные действия и видимое изменение состояния;
- сохранять изменения в браузерной IndexedDB после перезагрузки страницы;
- восстанавливаться из фиксированного seed после глобального сброса;
- демонстрировать версии, зависимости, audit, jobs и ошибки без притворства production-сервисом;
- иметь тесты на главное действие, persistence и reset;
- работать в опубликованной сборке GitHub Pages без собственного backend.

## 2. DemoDatabase для всех эпиков

### 2.1. Runtime

GitHub Pages раздаёт статические HTML/CSS/JavaScript. Приложение использует IndexedDB текущего browser origin как демонстрационную базу. Данные принадлежат конкретному браузеру/устройству и не синхронизируются между пользователями.

Имя базы: `kapgeo-demo`.

Минимальные object stores:

| Store | Содержимое |
|---|---|
| `meta` | `schemaVersion`, `seedVersion`, дата и состояние инициализации |
| `records` | текущие typed domain records всех эпиков |
| `versions` | immutable demo-версии, snapshots и статусы |
| `relations` | dependencies, stale markers и межмодульные ссылки |
| `auditEvents` | append-only demo audit |
| `jobs` | состояние имитируемых imports/calculations/renders |
| `artifacts` | manifest и Blob/JSON для demo-файлов, отчётов и результатов |
| `preferences` | saved views, layouts, language, accessibility и workspace preferences |

`records` индексируется минимум по `entityType`, `objectId`, `scopeId`, `status` и `updatedAt`. Доменные страницы не обращаются к IndexedDB напрямую: только через typed repository interfaces.

### 2.2. Seed, persistence и reset

- При первом запуске `DemoDatabase.initialize()` загружает связный synthetic seed.
- Любая command выполняется транзакцией и после успеха обновляет React Query cache.
- Повторное открытие страницы читает сохранённое состояние из IndexedDB.
- Кнопка «Сбросить демонстрационные данные» вызывает `DemoDatabase.reset()`: закрывает соединения, удаляет `kapgeo-demo`, создаёт схему заново и повторно применяет seed.
- Reset требует подтверждения и сообщает, что локальные изменения необратимо удаляются.
- Для QA предусмотрены экспорт/импорт полного demo snapshot в JSON; это не production backup.
- При смене `schemaVersion` применяются детерминированная migration или controlled reset с понятным сообщением.

### 2.3. Имитация внешних и тяжёлых операций

- Imports используют встроенные synthetic fixtures или выбранный пользователем локальный файл через Browser File API; ограниченный preview/result сохраняется в IndexedDB.
- Jobs выполняются детерминированным client-side lifecycle с задержками, retry/cancel и сохранённым состоянием.
- Расчёты без утверждённой формулы используют явно маркированный `DEMO / НЕ ДЛЯ ПРОИЗВОДСТВЕННЫХ РЕШЕНИЙ` результат.
- Экспорты создают скачиваемый client-side Blob и сохраняют artifact manifest в IndexedDB.
- Интеграции с LIMS/Modeling/Technology/Analytics представлены fake adapters и фиксируемыми событиями передачи.
- Ошибки, forbidden, conflict, stale и offline демонстрируются управляемыми fixtures/scenario switches.

## 3. Единый Definition of Done задачи

Task считается завершённой только если:

1. есть пользовательский вход в сценарий без ручного изменения URL;
2. primary action создаёт проверяемое изменение, job или artifact;
3. результат сохранён в соответствующем IndexedDB store;
4. reload восстанавливает результат;
5. global reset возвращает исходный seed;
6. fake/demo nature результата видна пользователю;
7. реализованы относящиеся к задаче loading/empty/error/forbidden/read-only/conflict/stale states;
8. добавлены unit/repository/component/route проверки в соответствии с риском;
9. `typecheck`, `test` и `build` проходят;
10. статус и ограничения обновлены в документации.

## 4. Последовательность

| Волна | Эпики | Результат прототипа |
|---|---|---|
| 0 | GEOX-E00 | versioned demo definitions, справочники и fixtures |
| 1 | GEOX-E01 | IndexedDB foundation, versions, dependencies, jobs, audit, workspace |
| 2 | GEOX-E02–E04 | сохраняемый well master, trajectory/core/lithology/samples |
| 3 | GEOX-E05–E06 | сохраняемые demo logs и interpretations |
| 4 | GEOX-E07 | колонки, документы, карта и client-side artifacts |
| 5 | GEOX-E08 | сохраняемый редактор разреза |
| 6 | GEOX-E09 | четыре демонстрационных метода запасов |
| 7 | GEOX-E10 | 2D modeling demo workbench |
| 8 | GEOX-E11 | 3D/DGM demo scenes и fallback |
| 9 | GEOX-E12 | publication, reset, regression и GitHub Pages hardening |

## 5. Эпики и задачи

Во всех таблицах колонка «IndexedDB» обязательна: она фиксирует минимальный сохраняемый результат task. Production-эквивалент каждой возможности остаётся в целевой спецификации и прежнем roadmap как future reference, но не входит в текущую приёмку.

### GEOX-E00 — предметные определения и synthetic baseline

Статус: **реализован в synthetic IndexedDB-прототипе**. Evidence: [21-e00-methodology-verification.md](./21-e00-methodology-verification.md).

Цель прототипа: превратить спорные правила руководства в видимые versioned demo definitions, не выдавая их за утверждённые производственные методики.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E00-T01 | Страница walkthrough пяти контуров с чек-листом операций, ролей и demo-ограничений; пользователь фиксирует подтверждение или вопрос. | records: walkthrough-decision; auditEvents |
| GEOX-E00-T02 | Каталог четырёх методик и формул с обозначениями, единицами, статусом verified/unverified и запускаемыми synthetic examples. Неподтверждённый результат имеет постоянную DEMO-маркировку. | records: method-definition; versions; artifacts: golden-example |
| GEOX-E00-T03 | Редактор synthetic dictionaries/conditions с владельцем, effective date, версиями и preview влияния. | records: dictionary/condition-definition; versions; relations |
| GEOX-E00-T04 | Галерея паспортов, колонок, разрезов и планов с selectable demo templates и preview страниц. | records: output-template; versions; artifacts |
| GEOX-E00-T05 | Панель профиля demo-нагрузки: число скважин, кривых, точек, ячеек и режим устройства; переключение меняет synthetic scenario, а не обещает SLA. | preferences: performance-scenario; records: volume-profile |

Acceptance эпика: все определения доступны из UI, reload сохраняет решения и выбранные profiles, reset возвращает исходный unverified baseline.
### GEOX-E01 — IndexedDB-платформа версий и зависимостей

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [09-e01-indexeddb-verification.md](./09-e01-indexeddb-verification.md).

Цель прототипа: заменить разрозненные in-memory stores единой сохраняемой demo-платформой.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E01-T01 | Well разделён на typed aggregates; карточка показывает независимые версии и IDs. | records: aggregates; versions |
| GEOX-E01-T02 | Все геологические pages читают и изменяют данные только через repository interfaces с IndexedDB adapter; HTTP adapter остаётся future reference. | все stores через DemoDatabase repositories |
| GEOX-E01-T03 | Рабочие create draft/save/compare/submit/return/approve/publish команды с expectedVersion и управляемым demo-conflict. | versions; records; auditEvents |
| GEOX-E01-T04 | Impact preview до сохранения и persisted stale markers после upstream-change; старый snapshot остаётся доступным. | relations; versions; auditEvents |
| GEOX-E01-T05 | Canonical quantities, conversions, qualifiers, uncertainty и missing reason используются формами и сохраняются без потери исходной единицы. | records: quantity-definition/measured-value; versions |
| GEOX-E01-T06 | Общий interval engine работает в редакторах, сохраняет atomic command result и точный diff; undo/redo живёт в draft до save. | records: interval-track; versions; auditEvents |
| GEOX-E01-T07 | CRS-aware Point/LineString/Polygon валидируются и сериализуются; demo transform доступен только для заранее заданной synthetic пары CRS. | records: geometry; versions; artifacts: transform-protocol |
| GEOX-E01-T08 | Общий монитор jobs переживает reload, показывает queued/running/succeeded/failed/cancelled/retry и выдаёт synthetic artifact. | jobs; artifacts; auditEvents |
| GEOX-E01-T09 | Единый audit/evidence UI показывает реальные demo-команды всех подключённых flows, фильтры, request IDs и ссылки на versions/jobs/artifacts. | auditEvents; versions; jobs; artifacts |
| GEOX-E01-T10 | Переиспользуемый Table/Canvas/Inspector workspace синхронизирует selection и URL; saved layout восстанавливается после reload. | preferences: workspace-state/layout; records: saved-view |

Acceptance эпика: состояние переживает reload, конфликт воспроизводим из scenario switch, published version immutable в demo repositories, reset полностью восстанавливает seed.
### GEOX-E02 — месторождения, кондиции и полный паспорт скважины

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [10-e02-well-master-verification.md](./10-e02-well-master-verification.md).

Цель прототипа: сделать сохраняемый well-master flow страниц 5–19 и 66–68 руководства.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E02-T01 | Реестр/карточка synthetic месторождений, залежей и участков: create/edit/archive, immutable code и dependency warning. | records: deposit/site/lens; versions; relations |
| GEOX-E02-T02 | ConditionSet editor с density, thresholds, corrections, tolerances, effective date, compare и demo approval. | records: condition-set; versions; auditEvents |
| GEOX-E02-T03 | Полный реестр скважин с колонками, группировкой, saved filters/views и восстановлением selection. | records: well; preferences: well-view |
| GEOX-E02-T04 | Wizard v2 создаёт draft скважины: принадлежность, проект, geometry, depths, spatial/duplicate demo-check и construction seed. | records: well/passport/construction; versions; relations |
| GEOX-E02-T05 | Паспорт содержит описание, документацию, проходку, освоение и геологию; изменения сохраняются независимо по aggregates. | records: well aggregates; versions |
| GEOX-E02-T06 | Construction editor поддерживает interval/point elements, диаметры, type policies, diff и undo/redo. | records: construction-elements; versions; auditEvents |
| GEOX-E02-T07 | Изменение координат/depth/CRS/trajectory показывает impact и создаёт stale dependencies. | relations; versions; auditEvents |
| GEOX-E02-T08 | Review/return/approve/publish/read-only/archive работают как сохраняемый demo-workflow с permission scenario. | records: workflow-state; versions; auditEvents |

Acceptance эпика: пользователь создаёт скважину, заполняет паспорт и конструкцию, публикует demo-version, перезагружает страницу и видит тот же результат; reset удаляет созданную скважину.
### GEOX-E03 — траектория, бурение, керн и depth mapping

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [11-e03-trajectory-core-verification.md](./11-e03-trajectory-core-verification.md).

Цель прототипа: создать достоверно выглядящий, но synthetic workflow геометрии ствола и керна.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E03-T01 | Реестр нескольких наборов инклинометрии с metadata и выбором основного. | records: trajectory-survey; versions |
| GEOX-E03-T02 | Demo import wizard принимает bundled/local fixture, показывает mapping/preview/replace diff/protocol. | artifacts: source/import-protocol; records: survey-staging; jobs |
| GEOX-E03-T03 | Детерминированный client-side trajectory job демонстрирует mean-angle, correction, vertical fallback и extrapolation; результат маркирован synthetic. | jobs; records: trajectory-result; versions; artifacts |
| GEOX-E03-T04 | Table/plan/profile/bottom inspector синхронизированы; SVG/CSV demo-export скачивается. | preferences: trajectory-view; artifacts |
| GEOX-E03-T05 | Core run v2 хранит drilling/interpreted ranges, recovery и issues. | records: core-run; versions |
| GEOX-E03-T06 | Source/composite measurement bins поддерживают rebin, size/count и missing semantics. | records: core-measurement; versions |
| GEOX-E03-T07 | Коробки, synthetic photos, storage и barcode-link доступны из рейса. | records: core-box/media-link; artifacts |
| GEOX-E03-T08 | Core interpreter выполняет reorder/reverse/stretch/no-core/split/merge/restore с undo/redo. | records: core-depth-draft; versions; auditEvents |
| GEOX-E03-T09 | Разрешённое перемещение material segment сохраняет связи литологии, промера и проб; preview перечисляет затронутые записи. | relations; records; versions |
| GEOX-E03-T10 | Consistency validator показывает recovery/coverage/no-core issues и блокирует demo-publish при errors. | records: validation-report; auditEvents |

Acceptance эпика: смена основного survey изменяет synthetic bottom, создаёт stale markers, а связанная проба остаётся доступной после допустимого перемещения сегмента.
### GEOX-E04 — литология, стратиграфия, пробы и лаборатория

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [12-e04-geology-samples-verification.md](./12-e04-geology-samples-verification.md).

Цель прототипа: связать interval tracks, samples и laboratory chain в сохраняемый synthetic flow.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E04-T01 | Три раздельных lithology tracks — core/log/composite — имеют версии, source badges и gap/no-data states. | records: geological-track; versions |
| GEOX-E04-T02 | UI справочников пород, минерализации, цвета и стратиграфии поддерживает synthetic effective versions и локализуемые labels. | records: dictionary-entry; versions |
| GEOX-E04-T03 | Description overrides демонстрируют inheritance и группировку без изменения source track. | records: description-override; relations; versions |
| GEOX-E04-T04 | Независимый stratigraphy editor поддерживает add/copy/shift/diff/undo/redo. | records: stratigraphy-track; versions; auditEvents |
| GEOX-E04-T05 | Sample v2 поддерживает несколько связанных интервалов, source/composite depth и четыре семейства проб. | records: sample/sample-link; relations; versions |
| GEOX-E04-T06 | Collection → request → laboratory → result → QA/QC работает как сохраняемый demo-workflow. | records: sample-workflow; versions; auditEvents |
| GEOX-E04-T07 | Lab values сохраняют qualifier, limit, method, unit, analyst, uncertainty и provenance. | records: lab-result/measured-value; versions |
| GEOX-E04-T08 | Granulometry workspace строит таблицу, histogram/cumulative и synthetic SGA/d60/d10 с явной demo-методикой. | records: granulometry-run; artifacts; jobs |
| GEOX-E04-T09 | Batch create и printable demo-label/barcode формируют downloadable artifact. | records: sample-batch; artifacts; auditEvents |
| GEOX-E04-T10 | Fake LIMS adapter показывает staging/reconciliation/conflict и применяет выбранные записи без silent overwrite. | records: integration-staging; jobs; auditEvents |

Acceptance эпика: цепочка от интервала до QA/QC результата переживает reload; approved demo-result редактируется только через новую версию.
### GEOX-E05 — demo ГИС import, curve processing и viewer

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [13-e05-logs-verification.md](./13-e05-logs-verification.md).

Цель прототипа: воспроизвести полный кликабельный ГИС-сценарий без production parser/storage.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E05-T01 | Пользователь выбирает bundled/local LAS/DAT fixture; сохраняются metadata, размер, synthetic checksum и доступ к исходному Blob в пределах браузера. | artifacts: raw-log-file; records: file-metadata |
| GEOX-E05-T02 | Parser profile selector имитирует LAS/DAT/station dialects и выдаёт deterministic parsed preview. | records: parser-profile/staging-row; jobs |
| GEOX-E05-T03 | Mapping/QC wizard настраивает depth, units, mnemonics, null и показывает issues до apply. | records: import-mapping/validation-report; jobs |
| GEOX-E05-T04 | Apply создаёт новую LogRun/curve version атомарно; partial scenario сохраняет rejected rows и protocol. | records: log-run/log-curve; versions; artifacts; auditEvents |
| GEOX-E05-T05 | Viewer читает bounded synthetic curve chunks и LOD по видимому диапазону, демонстрируя контракт больших данных. | records: curve-chunk; preferences: viewport |
| GEOX-E05-T06 | Renderer поддерживает произвольные tracks, overlay, linear/log scale, cursor, markers и table fallback. | preferences: viewer-layout; records: marker |
| GEOX-E05-T07 | Layout templates сохраняют порядок, ширину, scale и styles отдельно от scientific data. | preferences: log-layout; versions: view-template |
| GEOX-E05-T08 | Typed transform preview создаёт deterministic derived curve job с lineage и demo formula label. | jobs; records: derived-curve; relations; artifacts |
| GEOX-E05-T09 | Merge wizard задаёт ranges/order/corrections/overlap priority и создаёт новую merged curve version. | jobs; records: merged-curve; relations; versions |
| GEOX-E05-T10 | Main curve nomination проходит demo-review и показывает downstream impact/stale. | records: main-curve-selection; relations; auditEvents |

Acceptance эпика: fixture проходит file → parse → mapping → QC → apply → viewer; reload сохраняет LogRun, reset возвращает исходный набор.
### GEOX-E06 — tech/filtration/ore/core interpretation и AI

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence и проверки: [14-e06-interpretations-verification.md](./14-e06-interpretations-verification.md).

Цель прототипа: реализовать сохраняемые manual/auto/AI proposals и человеческое решение.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E06-T01 | Manual permeable interval editor использует общий depth workbench и version commands. | records: permeable-track; versions; auditEvents |
| GEOX-E06-T02 | Automatic KS demo job показывает parameters, preview и min-thickness issues; apply выполняется только пользователем. | jobs; records: interpretation-proposal; artifacts |
| GEOX-E06-T03 | Filtration track хранит synthetic properties, method, source, author/date и units. | records: filtration-track; versions |
| GEOX-E06-T04 | Differential intervals вводятся вручную или через fake adapter с preview. | records: differential-track/staging; versions |
| GEOX-E06-T05 | Ore intervals/composites поддерживают direct/differential connect/trim/split и diff. | records: ore-track/composite; versions; relations |
| GEOX-E06-T06 | Tech type alignment предлагает изменения из permeable intervals и применяет их атомарно после preview. | records: tech-track; versions; auditEvents |
| GEOX-E06-T07 | Preliminary/no-correction status видим и исключает запись из demo reserve selector. | records: eligibility-state; relations |
| GEOX-E06-T08 | Manual interpretation сохраняет несколько интервалов, synthetic calculations, evidence и reason. | records: manual-interpretation; versions; artifacts |
| GEOX-E06-T09 | AI workflow создаёт deterministic fake result с model version, confidence, calibration/evidence и diff; AI слой отделён от manual. | jobs; records: ai-interpretation; versions; artifacts |
| GEOX-E06-T10 | Human resolution, review и publish создают accepted composite и полный demo-audit. | records: resolved-interpretation; versions; auditEvents; relations |

Acceptance эпика: AI никогда не перезаписывает manual, preliminary result не попадает в запасы, а итоговое экспертное решение восстанавливается после reload.
### GEOX-E07 — профессиональные outputs, documents и GIS map

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence: [15-e07-outputs-verification.md](./15-e07-outputs-verification.md).

Цель прототипа: создать кликабельные колонки, документы, карту и скачиваемые client-side artifacts.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E07-T01 | SVG well-column scene показывает horizon/full bore и split scales по выбранной well version. | records: column-scene; preferences: column-view |
| GEOX-E07-T02 | Track composer управляет curves/lithology/construction/samples/ore/labels и сохраняет template. | records: column-template; versions; preferences |
| GEOX-E07-T03 | Curve level lines/labels выбираются на canvas и открывают inspector источника. | records: column-annotation; preferences |
| GEOX-E07-T04 | Legend генерируется из видимых synthetic data и scope. | records: legend-definition; artifacts |
| GEOX-E07-T05 | Layout templates имеют версии, preview и compare; layout change не инвалидирует scientific version. | versions: view-template; preferences; relations |
| GEOX-E07-T06 | Client-side PDF/SVG/DXF/XLSX demo-export создаёт Blob, manifest/checksum и download action. | artifacts; jobs; auditEvents |
| GEOX-E07-T07 | Multi-page preview поддерживает страницы, поля, crop, rotation и selection. | preferences: export-request; artifacts |
| GEOX-E07-T08 | Documents tab поддерживает upload synthetic/local file, version, download и archive с demo-permission scenarios. | artifacts: document-blob; records: document; versions; auditEvents |
| GEOX-E07-T09 | GIS-like SVG/Canvas map показывает CRS, trajectory, profiles/blocks, measure, selection и validated demo-edit. | records: spatial-layer/geometry-draft; versions; preferences |
| GEOX-E07-T10 | Managed saved views заменяют raw SQL и сохраняют filters/styles/layers. | preferences: managed-view; records: view-definition |

Acceptance эпика: колонка строится из exact version/template, экспорт действительно скачивается, документ и map edit сохраняются после reload, reset очищает пользовательские artifacts.
### GEOX-E08 — геотехнологические разрезы

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence: [16-e08-sections-verification.md](./16-e08-sections-verification.md).

Цель прототипа: заменить фиксированную картинку сохраняемым section project/workbench.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E08-T01 | Реестр SectionProject создаёт draft с metadata, stage, range и immutable input snapshot. | records: section-project/input-snapshot; versions |
| GEOX-E08-T02 | Profile route editor добавляет/переставляет/разворачивает segments, показывает synthetic LSQ fit и margins. | records: profile-route; versions; auditEvents |
| GEOX-E08-T03 | Well selection/corridor включает, исключает и упорядочивает скважины с distance diagnostics. | records: section-well; relations; preferences |
| GEOX-E08-T04 | Section scene синхронизирует wells/tracks/scales/selection/inspector и имеет table fallback. | preferences: section-viewport/layout; records: scene-selection |
| GEOX-E08-T05 | Tech connectivity поддерживает connect/disconnect one-to-many и pinch-out preview. | records: connectivity-graph; versions; auditEvents |
| GEOX-E08-T06 | Helper intervals имеют section-only scope и по умолчанию исключены из column/reserves. | records: helper-interval; relations; versions |
| GEOX-E08-T07 | Contour editor выполняет move/add/delete/Bezier/straighten с snap diagnostics и undo/redo. | records: contour-draft; versions; auditEvents |
| GEOX-E08-T08 | Rhythm/foundation editor выбирает synthetic dictionaries и строит roof/base paths. | records: rhythm-boundary/foundation; versions |
| GEOX-E08-T09 | Ore body editor создаёт balance/off-balance/preliminary bodies и показывает topology issues. | records: section-ore-body; versions; relations |
| GEOX-E08-T10 | Oxidation zones поддерживают multi-polyline, close/reverse/snap и validation. | records: oxidation-zone; versions |
| GEOX-E08-T11 | Auto-repair demo job создаёт proposal upstream diff; accept/reject не меняет approved version на месте. | jobs; records: repair-proposal; versions; auditEvents |
| GEOX-E08-T12 | Drawing composer собирает plan/section/tables/stamp и создаёт downloadable SVG/PDF demo artifact. | records: section-drawing; artifacts; jobs |

Acceptance эпика: пользователь создаёт section, меняет route/connectivity/ore geometry, публикует demo-version; upstream well change делает её stale и предлагает repair.
### GEOX-E09 — проекты запасов и четыре демонстрационные методики

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence: [17-e09-reserves-verification.md](./17-e09-reserves-verification.md).

Цель прототипа: показать полный workflow руководства, не выдавая synthetic calculations за утверждённые запасы.

Каждый экран и artifact содержит заметную маркировку «DEMO / НЕ ДЛЯ ПРОИЗВОДСТВЕННЫХ РЕШЕНИЙ», пока GEOX-E00-T02 не имеет verified definition.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E09-T01 | Reserve registry создаёт project, stage, ore packages, profiles и immutable input snapshot. | records: reserve-project/input-snapshot; versions |
| GEOX-E09-T02 | Ore intersection workbench поддерживает fast/normal/manual synthetic proposals и один active intersection per package/well. | records: reserve-intersection; versions; auditEvents |
| GEOX-E09-T03 | Effective thickness alignment сопоставляет ore/tech/filter/elevation/manual и сохраняет reason override. | records: thickness-alignment; relations; versions |
| GEOX-E09-T04 | Block editor создаёт balance/off-balance polygons, vertices, snap и topology issues. | records: reserve-block/geometry; versions; auditEvents |
| GEOX-E09-T05 | Well sets управляют included/network wells по block/cell и объясняют synthetic selection. | records: reserve-well-set; relations |
| GEOX-E09-T06 | Technological polygon/cells editor создаёт named cells и validation report. | records: technology-polygon/cell; versions |
| GEOX-E09-T07 | Calculation framework показывает preflight/run/history/compare/protocol через deterministic demo jobs. | jobs; records: calculation-run; versions; artifacts |
| GEOX-E09-T08 | Projection method использует approved synthetic fixture, показывает network averaging/ore ratio/hurricane preview и demo protocol. | records: method-run-projection; jobs; artifacts |
| GEOX-E09-T09 | Voronoi-like demo строит clipped synthetic cells, per-cell metrics и aggregate. | records: method-run-voronoi/cells; jobs; artifacts |
| GEOX-E09-T10 | Interval registry method показывает balance и technological off-balance summaries. | records: method-run-interval-registry; jobs; artifacts |
| GEOX-E09-T11 | Geostatistical demo принимает только accepted synthetic field version и создаёт marked result. | records: method-run-geostatistical; relations; jobs; artifacts |
| GEOX-E09-T12 | Method compare использует locked snapshot/scale; active result selection не перезаписывает runs и имеет отдельное demo-permission. | records: active-reserve-result; versions; auditEvents |
| GEOX-E09-T13 | Reserve plan отображает layers, labels, isolines/fill/layout и создаёт downloadable artifact. | records: reserve-plan; preferences; artifacts |
| GEOX-E09-T14 | Passport/approval/publication собирает immutable demo package со всеми sources, limitations и audit. | records: reserve-package; versions; relations; artifacts; auditEvents |

Acceptance эпика: четыре метода запускаются на одном locked synthetic snapshot, сохраняют отдельные runs и сравниваются; изменение intersection/block/condition помечает runs stale.
### GEOX-E10 — 2D геологическое моделирование

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence: [18-e10-2d-model-verification.md](./18-e10-2d-model-verification.md).

Цель прототипа: предоставить связный geology entry → modeling workspace с лёгкими client-side synthetic grids и fields.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E10-T01 | Geological model project создаётся из section/reserve synthetic snapshot. | records: model-project/input-snapshot; versions; relations |
| GEOX-E10-T02 | Data/grid domain editor создаёт nested regions, axes и demo faults/breaklines. | records: model-domain; versions |
| GEOX-E10-T03 | Mesh preview/materialize/inspect job строит ограниченную synthetic grid и diagnostics. | jobs; records: mesh; artifacts |
| GEOX-E10-T04 | Variable/source data manager включает/исключает points и support objects. | records: model-variable/source-point; relations |
| GEOX-E10-T05 | Histogram/statistics/validation выполняет client-side synthetic analysis и сохраняет rejection decisions. | records: data-analysis; artifacts; auditEvents |
| GEOX-E10-T06 | Variogram cloud workspace меняет direction/lag/tolerance/bandwidth и сохраняет scenario. | records: variogram-cloud; preferences; artifacts |
| GEOX-E10-T07 | Variogram model fit выбирает nested demo models, isotropy/anisotropy и параметры. | records: variogram-model; versions |
| GEOX-E10-T08 | Cross-validation показывает synthetic metrics/residuals и требует human acceptability decision. | records: cross-validation; artifacts; auditEvents |
| GEOX-E10-T09 | Kriging/IDW/min-curvature/Sibson-Laplace представлены lightweight deterministic plugins на малом fixture. | records: interpolation-run; jobs; artifacts |
| GEOX-E10-T10 | Search parameters и negative-weight policy сохраняются в run; jobs поддерживают cancel/retry. | jobs; records: search-parameters; auditEvents |
| GEOX-E10-T11 | Field review показывает coverage/no-data/quality mask и создаёт accepted field version только после решения. | records: geological-field; versions; artifacts; auditEvents |
| GEOX-E10-T12 | Geological environment/ore contours строятся по synthetic thresholds и передаются в reserves exact-version link. | records: geological-environment/ore-contour; relations; versions |
| GEOX-E10-T13 | 2D/volume views имеют URL-state, table fallback и downloadable PNG/SVG/JSON artifacts. | preferences: model-view; artifacts |

Acceptance эпика: методы сравниваются на одном snapshot и locked scale; accepted field содержит sources/method/parameters/CV и доступен reserve project по exact version.
### GEOX-E11 — 3D геологическая модель и DGM

Статус: **реализован в кликабельном прототипе (24 августа 2026)**. Evidence: [19-e11-dgm-verification.md](./19-e11-dgm-verification.md).

Цель прототипа: воспроизвести 3D/DGM workflow на малых synthetic meshes с 2D/table fallback; промышленный GPU/compute engine не требуется.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E11-T01 | Horizon dictionary/order/constraints editor создаёт versioned synthetic hierarchy. | records: horizon-definition/order; versions |
| GEOX-E11-T02 | Section-based picks/corridor сохраняет well/fractional pinch-out picks. | records: horizon-pick; relations; versions |
| GEOX-E11-T03 | Roof/thickness surface demo jobs строят малые surfaces и conflict diagnostics. | jobs; records: horizon-surface; artifacts |
| GEOX-E11-T04 | Plan constrained triangulation показывает nodes/edges/area-angle diagnostics. | records: plan-mesh; jobs; artifacts |
| GEOX-E11-T05 | Prismatic volume mesh создаётся из synthetic horizons с clipping/max-edge settings. | records: volume-mesh; jobs; artifacts |
| GEOX-E11-T06 | Mesh inspector показывает coordinates, triangles/prisms/groups и table fallback. | preferences: mesh-inspector; records: mesh-selection |
| GEOX-E11-T07 | Horizon groups editor назначает permeable/impermeable/custom groups. | records: horizon-group; versions |
| GEOX-E11-T08 | 3D data analysis/variography настраивает search ellipsoid и сохраняет synthetic result. | records: analysis-3d/variogram-3d; jobs; artifacts |
| GEOX-E11-T09 | 3D field demo jobs создают content/technological-type distributions на малой сетке. | records: field-3d; jobs; artifacts; versions |
| GEOX-E11-T10 | DGM composition выбирает accepted field per group/quantity и формирует exact references. | records: dgm; relations; versions |
| GEOX-E11-T11 | Plan slices/averages/integrals интерактивны и сохраняют выбранный slice scenario. | preferences: dgm-slice; artifacts |
| GEOX-E11-T12 | 3D isosurfaces/slices/section planes работают в доступном WebGL demo renderer; при отсутствии WebGL используется 2D/table fallback. | preferences: renderer-mode/view; artifacts |
| GEOX-E11-T13 | Versioned export/publication создаёт downloadable glTF-like JSON/DXF demo artifact и manifest. | artifacts; records: dgm-publication; versions; auditEvents |

Acceptance эпика: DGM ссылается только на accepted demo fields, URL восстанавливает slice/plane, а fallback позволяет изучить результат без WebGL.
### GEOX-E12 — publication, integrations и hardening прототипа

Статус: **реализован в synthetic IndexedDB-прототипе**. Evidence: [20-e12-publication-hardening-verification.md](./20-e12-publication-hardening-verification.md).

Цель прототипа: замкнуть end-to-end flow, сделать сохранение/reset явными и подтвердить работу на GitHub Pages.

| ID | Кликабельный результат прототипа | IndexedDB |
|---|---|---|
| GEOX-E12-T01 | Geology package composer выбирает scope, exact versions, consumers и limitations. | records: geology-package; relations; versions |
| GEOX-E12-T02 | Approval/return/reauth/signature-placeholder работает как demo-workflow; юридическая ЭЦП явно не имитируется. | records: approval-decision; versions; auditEvents |
| GEOX-E12-T03 | Fake consumer adapters передают exact version refs в Technology/Modeling/Analytics и создают доступные там demo-links. | records: handoff; relations; auditEvents |
| GEOX-E12-T04 | Withdraw/replacement сохраняет history, reason, notifications и replacement link. | records: publication-state/notification; versions; relations; auditEvents |
| GEOX-E12-T05 | Report/export history позволяет повторно скачать сохранённый browser artifact и очистить только пользовательские demo-артефакты. | artifacts; records: export-history; auditEvents |
| GEOX-E12-T06 | RU/KZ/EN demo terminology и language preference переключаются без reload; непереведённое помечается fallback. | preferences: locale; records: terminology |
| GEOX-E12-T07 | Keyboard, labels, reduced motion и non-color cues проверены; accessibility preferences сохраняются. | preferences: accessibility |
| GEOX-E12-T08 | Synthetic volume profiles демонстрируют LOD/virtualization/loading states; показатели являются demo budgets, не SLA. | preferences: performance-scenario; records: performance-result |
| GEOX-E12-T09 | File/type/size rejection, expression sandbox mock и sensitive-export permission представлены кликабельными scenarios без production security claim. | records: policy-scenario/denial; auditEvents |
| GEOX-E12-T10 | Прототип проверен в согласованных browser widths и на опубликованном GitHub Pages; compatibility flags сохраняются локально. | preferences: browser-qa; records: qa-run |
| GEOX-E12-T11 | Автоматизированный regression проходит well → section → reserve → model → publication, reload persistence и global reset. | все stores; records: regression-run |
| GEOX-E12-T12 | Help center объясняет каждый workspace, synthetic data, локальное хранение, экспорт snapshot и полный reset. | records: help-version; preferences: help-state |

Acceptance эпика: consumer открывает exact persisted demo-version, withdrawal не уничтожает историю, полный E2E проходит после reload, а reset восстанавливает эталонный seed на GitHub Pages.
<!-- EPICS -->

## 6. Cross-epic prototype backlog

| ID | Prototype-задача | IndexedDB-связь |
|---|---|---|
| GEOX-X01 | Storybook/route gallery для scientific workbench states на synthetic fixtures. | seed records и preferences scenarios |
| GEOX-X02 | Генератор связного deterministic geological seed с фиксированными IDs. | наполняет все domain stores через seedVersion |
| GEOX-X03 | Zod schemas и contract tests для IndexedDB records/repositories; OpenAPI остаётся future reference. | валидирует records/versions/jobs/artifacts |
| GEOX-X04 | Persisted client-side job scheduler с polling-like timer, reload recovery и deterministic failure/retry. | jobs; auditEvents |
| GEOX-X05 | Общий artifact manifest/checksum и browser Blob download. | artifacts |
| GEOX-X06 | Geometry invariant/golden fixtures для sections/reserves. | records: geometry-fixture; artifacts |
| GEOX-X07 | Calculation golden/demo dataset harness с verified/unverified marker. | records: calculation-fixture; artifacts |
| GEOX-X08 | Visual regression fixtures для columns/sections/plans. | artifacts: reference-image/scene |
| GEOX-X09 | WebGL capability/fallback scenario matrix. | preferences: renderer-capability; records: qa-run |
| GEOX-X10 | Compatibility adapters мигрируют текущие in-memory routes в IndexedDB без одновременной перезаписи всех pages. | meta: migration-state; records; versions |

Cross-epic acceptance: ни одна page не пишет напрямую в IndexedDB, schema/seed version проверяются при старте, fixtures воспроизводимы, а reset покрыт отдельным integration test.
<!-- CROSS_EPIC -->

## 7. Правило выполнения целого эпика

Перед началом эпика агент ставит одну цель: закрыть весь эпик. Эпик завершается только после прохождения всех его task rows, проверки persistence после reload, глобального reset, полного набора тестов и синхронизации документации. Частично выполненный эпик остаётся `IN PROGRESS`; отдельная кликабельная страница не означает завершение эпика.


