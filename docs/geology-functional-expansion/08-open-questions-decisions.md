# Решения и открытые вопросы расширения геологии

## 1. Статус документа

Здесь фиксируются решения, специфичные для глубокой детализации геологии. Общесистемные решения и OQ остаются в `docs/ui-ux/11-traceability-open-questions.md`.

Статусы:

- `ACCEPTED` — применять в реализации;
- `PROPOSED` — безопасная рекомендация до согласования;
- `OPEN-BLOCKING` — нельзя реализовать authoritative calculation/publication;
- `OPEN-NONBLOCKING` — UI/contract можно продолжать с маркированной default policy;
- `SUPERSEDED` — историческое решение заменено новым.

## 2. Принятые решения

| ID | Решение | Статус | Последствие |
|---|---|---|---|
| GEOX-DEC-01 | Руководство — источник предметных функций, но не целевой layout/style/security architecture | ACCEPTED | операции сохраняются, desktop UI не копируется |
| GEOX-DEC-02 | Весь функционал пяти глав входит в конечный target scope | ACCEPTED | 2D/3D не исключаются; поставляются волнами |
| GEOX-DEC-03 | 3D остаётся P2 по порядку, но не является optional scope | ACCEPTED | сначала domain/2D foundation, затем full 3D/DGM |
| GEOX-DEC-04 | Геология владеет geological semantics/approval, Modeling — mesh/variography/interpolation/run/render engines | ACCEPTED | нет двух движков 2D/3D |
| GEOX-DEC-05 | Published data immutable; correction creates new version | ACCEPTED | audit/reproducibility |
| GEOX-DEC-06 | Upstream change only marks downstream stale and proposes repair/rerun | ACCEPTED | no silent cascade |
| GEOX-DEC-07 | Scientific data version отделена от layout/view template version | ACCEPTED | цвет/подпись не инвалидируют расчёт |
| GEOX-DEC-08 | Preliminary ore result without corrections cannot be used for reserves | ACCEPTED | explicit eligibility/preflight |
| GEOX-DEC-09 | Helper intervals/points for section geometry marked `section-only` and excluded from reserves by default | ACCEPTED | visual hypothesis не становится input silently |
| GEOX-DEC-10 | Formula/calculation code cannot be implemented from OCR text | ACCEPTED | manual specification + golden tests required |
| GEOX-DEC-11 | Raw source file and original values are immutable | ACCEPTED | transforms/import apply create derived versions |
| GEOX-DEC-12 | User SQL from legacy map is not reproduced in subject UI | ACCEPTED | saved filters/views; advanced definitions are admin-governed |
| GEOX-DEC-13 | All heavy imports/calculations/renders/exports are jobs | ACCEPTED | navigation remains available; exact run metadata |
| GEOX-DEC-14 | Canvas operations require table/form/keyboard alternative | ACCEPTED | accessibility and precise editing |
| GEOX-DEC-15 | Current prototype routes are retained during strangler migration | ACCEPTED | repository seam first, vertical route replacement |

## 3. Блокирующие вопросы до authoritative reserve calculation

| ID | Вопрос | Owner | Блокирует | Временное действие |
|---|---|---|---|---|
| GEOX-OQ-01 | Утвердить точные формулы страниц 252–263, обозначения и исправления опечаток | R3 + методолог | E09 calculation plugins | реализовать contracts/UI, authoritative result не выдавать |
| GEOX-OQ-02 | Правила округления на входе, промежуточных и итоговых показателях | R3 | golden parity/reports | хранить full precision, показывать configurable preview |
| GEOX-OQ-03 | Какое нормативное издание/версия «методики ГКЗ» является основанием | R3/legal | method version | method status `draft/unverified` |
| GEOX-OQ-04 | Точные определения balance/off-balance/empty для каждой стадии | R3 | classification/intersections | ConditionSet schema без hard-coded thresholds |
| GEOX-OQ-05 | Критерий и порядок многократной срезки ураганов, tie-break | R3 | projection plugin | только UI preview |
| GEOX-OQ-06 | Правила выбора сетевых скважин и ближайших множеств при равных расстояниях | R3 | projection determinism | deterministic explicit tie-break после согласования |
| GEOX-OQ-07 | Разрешённые holes/multipolygons и tolerance для block/cell topology | R3/GIS | block editor/run | strict no self-intersection, holes disabled by default |
| GEOX-OQ-08 | Должен ли один reserve project хранить несколько accepted methods или один official | R3/R12 | approval/publication | хранить history, active result один |

## 4. Вопросы по скважинам, ГИС и интерпретации

| ID | Вопрос | Owner | Влияет на | Предложение |
|---|---|---|---|---|
| GEOX-OQ-09 | Какие LAS/DAT/станционные dialects входят в первую production-поставку | R2/data owners | E05 parser profiles | собрать anonymized fixtures и rank by volume |
| GEOX-OQ-10 | Требуется ли совместимость GammaZ как файл/API/clipboard | R2/IT | E06 adapter | versioned file import; clipboard не считать production integration |
| GEOX-OQ-11 | Набор разрешённых функций expression language и unit inference | R2/security | curve transforms | small typed DSL, no random functions in approved results |
| GEOX-OQ-12 | Допустимы ли random functions legacy в scientific transform | R2/methodology | reproducibility | запретить для approved; experimental run records seed |
| GEOX-OQ-13 | Методы trajectory calculation кроме среднего угла | R1/R2 | E03 | plugin contract, mean-angle baseline after validation |
| GEOX-OQ-14 | Минимальный зенитный угол и правила vertical override | R1 | E03 | ConditionSet + explicit decision record |
| GEOX-OQ-15 | Полный перечень фильтрационных параметров/единиц/методов | R1/R5 | E06 | quantity registry interview |
| GEOX-OQ-16 | Точные параметры potential/gradient KS methods | R2 | E06 | versioned method definition, no client constants |
| GEOX-OQ-17 | Правило технологического типа ore composite при смешанных интервалах | R1/R3 | E06/E09 | preserve source mix + calculated class; manual override with reason |
| GEOX-OQ-18 | Нужна ли binary parity с историческими GammaZ/legacy results | product/R2 | acceptance | agree tolerance/golden dataset, not screenshot parity |

## 5. Вопросы по керну, пробам и лаборатории

| ID | Вопрос | Owner | Влияет на | Предложение |
|---|---|---|---|---|
| GEOX-OQ-19 | Сохраняется ли ограничение 0,1 м для интервалов с промером | R1 | core interpreter | policy by measurement method, not global constant |
| GEOX-OQ-20 | Полный перечень sample families и обязательных реквизитов | R1/lab | E04 | four legacy families + configurable types |
| GEOX-OQ-21 | Qualifier/detection-limit правила и допустимость отрицательных значений | lab/QA | lab validation | per-quantity method rules |
| GEOX-OQ-22 | Формула SGA и точный расчёт d60/d10/интерполяция между фракциями | lab/R1 | granulometry golden tests | authoritative written formula required |
| GEOX-OQ-23 | Barcode/chain-of-custody/LIMS scope первой очереди | lab/IT | E04 | domain ready; integration after manual workflow |

## 6. Вопросы по разрезам

| ID | Вопрос | Owner | Влияет на | Предложение |
|---|---|---|---|---|
| GEOX-OQ-24 | Сохраняется ли default pinch-out 1/4, и для каких стадий | R1 | E08 | project preset, editable with reason |
| GEOX-OQ-25 | Разрешённые one-to-many connectivity cases | R1 | topology validator | encode explicit connection graph and rules |
| GEOX-OQ-26 | Кто и как создаёт rhythm package/foundation dictionaries | R1/R13 | E02/E08 | governed dictionary with immutable ID |
| GEOX-OQ-27 | Может ли helper interval существовать только в одном section | R1 | dependency model | yes by default; promotion requires separate interpretation workflow |
| GEOX-OQ-28 | Auto-repair может ли менять approved section автоматически | R1/R12 | stale workflow | no; proposal → review → new version |
| GEOX-OQ-29 | Какие drawing variants обязательны для ГКЗ/внутренних целей | R1/R3 | E07/E08 reports | three reference templates after interview |

## 7. Вопросы по 2D/3D

| ID | Вопрос | Owner | Влияет на | Предложение |
|---|---|---|---|---|
| GEOX-OQ-30 | Обязательные interpolation methods и parameter sets | R4/R5/R3 | E10 | kriging, IDW, min curvature, Sibson/Laplace baseline |
| GEOX-OQ-31 | Variogram model families, fit criteria and acceptable CV thresholds | R4/R5 | E10/E11 | versioned library + human acceptance |
| GEOX-OQ-32 | Являются ли 20–50 м, 40–80 м и 5 ячеек нормативом или рекомендацией | R4/R5 | mesh preflight | show preset warning, not blocking until confirmed |
| GEOX-OQ-33 | Требуемые mesh quality metrics and limits | R4/compute | E10/E11 | area/angle/aspect/invalid count baseline |
| GEOX-OQ-34 | Точная 3D prism generation and horizon pinch-out handling | R4/R5 | E11 | algorithm specification and synthetic golden volumes |
| GEOX-OQ-35 | Моделируется содержание урана, tech type или additional quantities | R4/R5 | 3D field schema | quantity-configurable, first validated set explicit |
| GEOX-OQ-36 | Требуемые 3D output formats besides DXF | downstream/IT | E11 export | glTF/VTK/industry format assessment; no assumption |
| GEOX-OQ-37 | Максимальные mesh/field volumes and GPU/browser baseline | IT/data owner | storage/render/performance | profiling spike before E11 UI lock |
| GEOX-OQ-38 | Нужен ли server-side 3D rendering for low-capability clients | IT/product | E11 fallback | 2D slice/table mandatory; server images optional |

## 8. Вопросы по отчётам, публикации и безопасности

| ID | Вопрос | Owner | Влияет на | Предложение |
|---|---|---|---|---|
| GEOX-OQ-39 | Полный каталог утверждённых форм, stamps and signatories | business/legal | E07/E08/E09 | agree three P0 templates, expand later |
| GEOX-OQ-40 | Требуется ли юридически значимая ЭЦП | legal/security | approval | workflow/reauth now, provider later |
| GEOX-OQ-41 | Разрешённые export formats и чувствительность координат | security/GIS | permissions/export | `geo.export.sensitive` + policy manifest |
| GEOX-OQ-42 | Retention/legal hold для raw files/results/reports | legal/IT | storage/delete | no hard delete before policy |
| GEOX-OQ-43 | Кто может withdraw published geology/reserve/model package | RACI | publication | R12 + scoped permission + reason + reauth |
| GEOX-OQ-44 | Какие consumers получают automatic notification/invalidation | module owners | handoff | event subscription by exact package version |

## 9. Нефункциональные вопросы

| ID | Вопрос | Влияет на |
|---|---|---|
| GEOX-OQ-45 | wells/curves/points/mesh cells/section complexity p50/p95/max | performance architecture |
| GEOX-OQ-46 | approved browsers/GPUs and remote desktop usage | Canvas/WebGL/fallback |
| GEOX-OQ-47 | offline/poor network requirement at field sites | caching/upload/resume |
| GEOX-OQ-48 | decimal separators, precision and RU/KZ/EN scientific terms | localization/input/output |
| GEOX-OQ-49 | storage/compute SLA and maximum job runtime | job UX/cancel/retry |
| GEOX-OQ-50 | exact CRS transformations and approved geodetic libraries | map/trajectory/export |

Техническая граница уже зафиксирована в `GEOX-E01-T07`: scientific geometry всегда содержит CRS, а преобразование между разными CRS невозможно без явно переданного `GeometryTransformAdapter`. Foundation не выбирает библиотеку и не подменяет трансформацию простой сменой идентификатора; конкретная реализация adapter остаётся открытой до решения `GEOX-OQ-50`.

## 10. Решение по прежней неоднозначности 3D

Ранее общесистемный `DEC-12` фиксировал «3D — P2 до подтверждения» и `C03` считал глубину browser-реализации неоднозначной. Текущая пользовательская постановка явно требует существенно расширить систему по всему руководству, включая главы 4 и 5.

Поэтому:

- `DEC-12` должен считаться **SUPERSEDED** в части обязательности scope;
- 3D включён в конечный scope по `GEOX-DEC-02/03`;
- P2 означает только последовательность после P0/P1 foundation;
- точные алгоритмы, performance limits и форматы остаются OPEN, но не сам факт наличия 3D/DGM.

## 11. Формат записи нового решения

| Дата | ID | Решение | Статус | Участники/owner | Основание | Затронутые эпики/docs |
|---|---|---|---|---|---|---|
| 2026-08-20 | GEOX-DEC-01–15 | базовые решения детализации | ACCEPTED | product analysis | руководство + текущая архитектура | весь GEOX комплект |

При ответе на OQ:

1. записать формулировку и дату;
2. приложить нормативный/экспертный источник;
3. обновить product/architecture/backlog/traceability;
4. добавить/обновить fixture and tests;
5. не удалять исторический вопрос — пометить resolved/superseded.
