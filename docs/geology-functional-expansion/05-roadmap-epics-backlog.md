# Дорожная карта, эпики и задачник расширения

> **Статус с 24.08.2026: future-production reference.**
>
> Авторитетный backlog текущего кликабельного прототипа находится в
> [05-prototype-epics-backlog.md](./05-prototype-epics-backlog.md). Текущий этап использует synthetic data,
> IndexedDB persistence/reset и GitHub Pages; production-требования этого документа не входят в текущий DoD.

## 1. Правило поставки

Весь функционал руководства входит в целевой scope. Приоритет определяет порядок поставки, а не исключение функции:

- **P0:** данные и процессы, без которых дальнейшие разрезы/запасы/модели недостоверны;
- **P1:** полный профессиональный контур разрезов, запасов и 2D;
- **P2:** 3D/DGM и расширенная визуализация после устойчивого 2D/compute foundation.

Каждый эпик заканчивается работающим vertical slice с сохранением, version/diff, validation, states и тестами.

## 2. Последовательность и зависимости

| Волна | Эпики | Результат | Зависит от |
|---|---|---|---|
| 0. Согласование | GEOX-E00 | подтверждённые формулы, scope, owners | текущая документация |
| 1. Foundation | GEOX-E01 | версии, зависимости, quantities, jobs, repositories | E00 только для спорных правил |
| 2. Well master | GEOX-E02–E04 | полный паспорт, trajectory/core/lithology/samples | E01 |
| 3. Logs/interpretation | GEOX-E05–E06 | real import, curves, tech/ore/core interpretation | E01–E04 |
| 4. Outputs/map | GEOX-E07 | профессиональные колонки, документы, GIS map | E02–E06 |
| 5. Sections | GEOX-E08 | route, horizons, ore bodies, drawing | E02–E07 |
| 6. Reserves | GEOX-E09 | intersections, blocks, 4 methods, plans | E08 + E00 formulas |
| 7. 2D | GEOX-E10 | domain/mesh/variography/fields/contours | E01, E08/E09 inputs |
| 8. 3D | GEOX-E11 | horizons/surfaces/volume mesh/DGM/3D | E10 foundation |
| 9. Publication/hardening | GEOX-E12 | end-to-end approval, handoff, performance, localization | E02–E11 |

Параллельная реализация допустима только после стабилизации общих contracts. Например, UI колонки и backend импорта могут идти параллельно, но оба используют утверждённые `LogCurveVersion`/`ViewTemplate` schemas.

## 3. GEOX-E00 — предметное согласование и calculation specification

**Приоритет:** P0.  
**Цель:** не допустить реализации математических правил по OCR или предположениям.

### Задачи

- **GEOX-E00-T01 — экспертный walkthrough пяти контуров.**
  - R1: паспорт, керн, литология, tech/ore intervals;
  - R2: ГИС, transformations, интерпретация;
  - R3: intersections, blocks, four reserve methods;
  - R4/R5: 2D/3D, variography, mesh, DGM;
  - зафиксировать операции, которые используются фактически, и обязательные shortcuts.
- **GEOX-E00-T02 — каталог формул.**
  - вручную переписать формулы страниц 252–263;
  - определить обозначения, единицы, округление, missing/zero, порядок операций;
  - версии методик и нормативные основания;
  - golden examples с ожидаемыми результатами.
- **GEOX-E00-T03 — dictionaries/conditions inventory.**
  - породы, минерализации, стратиграфия, curve quantities, construction types;
  - стадии, типы интервалов, ore/rhythm packages;
  - effective-date и owner.
- **GEOX-E00-T04 — output forms.**
  - обязательные passport/column/section/reserve templates;
  - реквизиты, форматы, подписи, page setup;
  - legal/signature policy.
- **GEOX-E00-T05 — data volume/performance profile.**
  - wells/deposit, curves/run, samples, section wells, block vertices, mesh cells;
  - browser/network constraints and offline expectations.

### Критерий выхода

- formula specification подписана R3;
- есть владельцы справочников/условий;
- определён P0 набор отчётов;
- открытые вопросы имеют owner/deadline или принятую безопасную default policy.

## 4. GEOX-E01 — геологическая платформа версий и зависимостей

**Приоритет:** P0.  
**Цель:** создать основание, на котором расширение не превращается в in-memory набор форм.

### Задачи

- **T01 Domain split.** Разделить current `Well` types на aggregates; добавить IDs и contract tests.
- **T02 Repository boundary.** Ввести interfaces и demo/http implementations; вывести hard-coded data из pages.
- **T03 Version commands.** Create draft, save with `expectedVersion`, compare, submit, return, approve, publish.
- **T04 Dependency graph.** `DependencyRef`, impact preview, stale records/events.
- **T05 Quantities/units.** Canonical quantity registry, conversions, missing/qualifier.
- **T06 Interval engine.** Policies, add/split/merge/stretch/shift/copy, diff, undo/redo commands.
- **T07 Geometry primitives.** CRS-aware points/lines/polygons, validation and serialization.
- **T08 Scientific jobs.** Common job monitor, fake deterministic jobs, error/diagnostic states.
- **T09 Audit/evidence.** Append-only demo contract, source badges, request IDs.
- **T10 Shared workspace.** Table/canvas/inspector selection, keyboard table fallback.

### Acceptance

- concurrent edit produces compareable `409`, not last-write-wins;
- upstream draft can show dependent objects before save;
- published object remains immutable;
- changing only view settings does not change scientific hash;
- demo repository resets deterministically;
- unit tests cover interval, quantity, version and dependency invariants.

### Статус реализации на 24.08.2026

| Задача | Статус | Проверяемый результат | Осталось |
|---|---|---|---|
| T01 Domain split | Частично | `WellPassportVersion` и `WellConstructionVersion` отделены от compatibility `Well` | остальные well aggregates и contract generation |
| T02 Repository boundary | Частично | interface, deterministic demo repository, HTTP adapter и compatibility API для паспорта | перевести остальные geology stores/pages |
| T03 Version commands | Частично | save с `expectedVersion`, idempotency, typed conflict и immutable baseline history | create draft, compare UI, submit/return/approve/publish |
| T04 Dependency graph | Частично | impact preview и stale records для passport → section/model/column | persisted graph, rebase/resolve и остальные aggregates |
| T05 Quantities/units | Готово: foundation | canonical registry, compatible conversions, qualifiers/missing/uncertainty/range validation; GEO-11 integration | расширять quantity catalog вместе с новыми сущностями и dictionaries |
| T06 Interval engine | Готово: foundation | policies, add/update/split/merge/stretch/shift/copy/remove, diff, undo/redo; GEO-09 integration | подключить construction/core/stratigraphy/sample/ore tracks |
| T07 Geometry primitives | Готово: foundation | CRS-aware Point/LineString/Polygon, topology/range validation, bounds/metric operations, deterministic `kapgeo.geometry/v1`, adapter-gated transform; passport integration | подключить утверждённый CRS adapter после OQ-50, clipping/snapping и остальные spatial aggregates |
| T08 Scientific jobs | Готово: foundation | contract/lifecycle, deterministic demo + HTTP repository, common Query client/card/monitor, typed diagnostics/problem, cancel/retry; home и LAS/DAT integration; 7 новых тестов | backend persistence, SSE/WebSocket delivery и подключение следующих calculation/export flows |
| T09 Audit/evidence | Готово (foundation + v1 UI) | `science.job.*` события, retry/cancel/poll прогресс, dedupe и in-memory append-only цепочка; вкладка скважины отображает timeline версий+jobs | закрыть policy-audit для остальных флоу и production persistence |
| T10 Shared workspace | Готово (phase 1+2) | общий selection/inspector/table/card + shared URL-контракт |

Эпик остаётся **в работе**: завершены foundation-срезы T05/T06/T07/T08/T09 и passport/construction часть T01–T04, но production jobs transport, full workflow, расширенный audit/evidence и production persistence ещё не реализованы.

## 5. GEOX-E02 — месторождения, кондиции и полный паспорт скважины

**Приоритет:** P0.  
**Цель:** закрыть страницы 5–19 и 66–68 руководства.

### Задачи

- **T01 GEO-02 deposit registry/card.** Sites, deposits, lenses, immutable codes, dependencies.
- **T02 ConditionSet.** Effective versions, density, thresholds, angle corrections, tolerances, approval.
- **T03 Well registry completeness.** Новые filters/columns/saved views.
- **T04 Well create wizard v2.** Belonging, project, geometry, depths, duplicate/spatial check, construction draft.
- **T05 Passport tabs.** Description, documentation, drilling, completion, geology.
- **T06 Construction editor.** Typed interval/point elements, diameters, overlap-by-type rules.
- **T07 Version impact.** Coordinates/depth/CRS/trajectory dependencies.
- **T08 Well workflow.** Review/publish and read-only states.

### Demo flow

Создать скважину → заполнить паспорт/проходку/освоение/геологию → добавить конструкцию → получить warning по пробелу и error по недопустимой глубине → исправить → опубликовать version → увидеть no-dependent-yet state.

### Acceptance

- все поля руководства представлены или имеют recorded decision об исключении;
- точечный cement node не моделируется фальшивым интервалом;
- координатное изменение published well создаёт новую версию;
- delete блокируется/архивирует при dependencies;
- все tabs имеют loading/empty/error/forbidden/read-only/conflict.

## 6. GEOX-E03 — траектория, бурение, керн и depth mapping

**Приоритет:** P0.  
**Цель:** создать достоверную геометрию и связь source/composite depths.

### Задачи

- **T01 Survey registry.** Multiple inclinometry sets, main nomination, metadata.
- **T02 Survey import.** File/profile/mapping/preview/replace diff/protocol.
- **T03 Trajectory calculation.** Mean-angle baseline, correction, vertical fallback, below-last extrapolation.
- **T04 Trajectory views.** Table, plan/profile, well bottom calculation, export.
- **T05 Core run v2.** Drilling and interpreted ranges/recovery.
- **T06 Core measurement.** Source/composite bins, rebin by size/count, missing semantics.
- **T07 Core boxes/media.** Storage, photos, barcode/links.
- **T08 Core interpretation workbench.** Reorder/reverse/stretch/no-core/split/merge/restore.
- **T09 Linked movement.** Lithology/measurement/samples follow material segment.
- **T10 Consistency validator.** Recovery, coverage, no-core intersections, special 0.1m restriction where confirmed.

### Acceptance

- nominated survey changes calculated bottom and marks dependents stale;
- source and composite depths never overwrite each other;
- invalid core data blocks interpreter start with actionable issues;
- undo/redo works within draft; reset requires confirmation;
- sample link remains valid after allowed segment movement.

## 7. GEOX-E04 — литология, стратиграфия, пробы и лаборатория

**Приоритет:** P0.

### Задачи

- **T01 Three lithology tracks.** Core/log/composite separate versions and provenance.
- **T02 Dictionaries.** Rock, mineralization, color, stratigraphy IDs/effective date/localization.
- **T03 Description overrides.** Passport/full-bore inheritance and grouping.
- **T04 Stratigraphy track.** Independent interval editor and copy/shift.
- **T05 Sample v2.** Multi-interval, source/composite depths, four sample families.
- **T06 Sample workflow.** Collection, request, laboratory, result, QA/QC.
- **T07 Lab values.** Qualifiers, limits, method, unit, analyst, provenance.
- **T08 Granulometry.** Fractions, mass/percent, losses, SGA, histogram/cumulative, d60/d10.
- **T09 Batch/labels.** Batch create, barcode/print if in approved scope.
- **T10 LIMS adapter contract.** Staging/reconciliation, not direct overwrite.

### Acceptance

- all tracks distinguish gap from transparent/no-data;
- same sample can have several linked intervals without duplicate sample entity;
- zero/negative/qualifier semantics follow configured quantity rules;
- granulometry calculation has golden tests;
- approved lab result cannot be edited in place.

## 8. GEOX-E05 — production ГИС import, curve processing и viewer

**Приоритет:** P0.

### Задачи

- **T01 Raw file storage/checksum.** Upload and malware/size policy.
- **T02 Parser profiles.** LAS dialects, DAT and approved station formats.
- **T03 Mapping/QC.** Depth, units, mnemonics, null, calibration, preview, issues.
- **T04 Apply/version.** Atomic apply, partial result protocol, no destructive overwrite.
- **T05 Curve storage/LOD.** Chunked samples, range query, downsampling.
- **T06 Viewer renderer.** Arbitrary tracks, overlay, scale/log, cursor, markers.
- **T07 Layout templates.** Track order/width/scale/styles persisted separately.
- **T08 Typed transform.** Expression preview/job/derived lineage.
- **T09 Merge curves.** Ranges/order/corrections/overlap priority/preview.
- **T10 Main curve nomination.** Review and impact.

### Acceptance

- реальный fixture LAS проходит upload→parse→map→QC→apply;
- source file and previous curve remain downloadable/auditable;
- viewer requests visible range, not entire giant curve;
- derived/merged curve links every source/version and operation;
- unsupported unit blocks merge/transform.

## 9. GEOX-E06 — tech/filtration/ore/core interpretation и AI

**Приоритет:** P0/P1.

### Задачи

- **T01 Permeable interval manual editor.** Common depth workbench.
- **T02 Automatic KS interpretation.** Potential/gradient methods, preview parameters, min thickness.
- **T03 Filtration track.** Typed properties, method, source, date/author.
- **T04 Differential intervals.** Direct entry/import adapter.
- **T05 Ore intervals/composites.** Direct and differential workflows, connect/trim/split.
- **T06 Tech type alignment.** Apply from permeable intervals with preview.
- **T07 Preliminary-no-correction status.** Prevent reserve use.
- **T08 Manual interpretation workflow.** Multi-interval, calculations, evidence.
- **T09 AI workflow v2.** Real snapshots, diff, confidence/calibration, reason.
- **T10 Review/publish.** Accepted composite and audit.

### Acceptance

- auto result is preview/draft until human apply/save/approve;
- reserve selector excludes preliminary/non-approved result;
- deleting source interval proposes composite reconciliation and diff;
- AI never overwrites manual track;
- every calculated property exposes method and sources.

## 10. GEOX-E07 — профессиональные outputs, documents и GIS map

**Приоритет:** P1.

### Задачи

- **T01 Vector well-column scene.** Horizon/full bore and split vertical scales.
- **T02 Track composer.** Curves, lithology, construction, samples, ore, labels.
- **T03 Curve level lines/labels.** Intersections and inspector.
- **T04 Generated legend.** Base/deposit/drawing scope.
- **T05 Layout versioning.** Templates, preview, compare.
- **T06 Server render contract.** PDF/SVG/DXF/XLSX artifacts and manifest.
- **T07 Multi-page preview.** Pages, fields, crop, rotation, selection.
- **T08 Documents tab.** Upload/version/download/delete/archive permissions.
- **T09 Real GIS map.** CRS, trajectory, profiles/blocks, measure, selection and edit.
- **T10 Managed views.** Saved filters/styles in place of raw user SQL.

### Acceptance

- column generated from exact well version and template version;
- SVG/PDF output matches preview within approved tolerance;
- moving label creates layout revision only;
- document storage has checksum/version/access audit;
- map edit creates well draft and impact preview.

## 11. GEOX-E08 — геотехнологические разрезы

**Приоритет:** P1.

### Задачи

- **T01 Section registry/project/input snapshot.** Metadata, stages, range, versions.
- **T02 Profile route editor.** Segments, LSQ fit, margins, reverse/reorder/connect.
- **T03 Well selection/corridor.** Include/exclude/order/distance diagnostics.
- **T04 Section scene.** Wells/tracks/scales/selection/inspector.
- **T05 Tech connectivity.** Connect/disconnect one-to-many and pinch-outs.
- **T06 Helper intervals.** Section-only scope and cross-section impact.
- **T07 Contour points/smoothing.** Move/add/delete/Bezier/straighten/undo.
- **T08 Rhythm/foundation.** Dictionaries, roof/base paths.
- **T09 Ore bodies.** Balance, off-balance and preliminary.
- **T10 Oxidation zones.** Multi-polyline, close/reverse/snap.
- **T11 Auto-repair proposal.** Upstream change diff, accept/reject.
- **T12 Drawing composer.** Plan/section/tables/stamp/export.

### Acceptance

- section cannot use unpublished well data without `experimental` marker;
- route and well list never silently change each other;
- helper interval excluded from column/reserves by default;
- topology errors block publish and link to exact geometry;
- upstream well version marks section stale and creates repair proposal.

## 12. GEOX-E09 — проекты запасов и четыре методики

**Приоритет:** P0/P1.

### Задачи

- **T01 Reserve registry/project snapshot/stages.** Ore packages and profiles.
- **T02 Ore intersection workbench.** Fast/normal/manual, one per package/well.
- **T03 Effective thickness alignment.** Ore/tech/filter/elevation/manual.
- **T04 Block editor.** Balance/off-balance polygons, vertices, snap and topology.
- **T05 Well sets.** Included/network by balance/cell.
- **T06 Technological polygon/cells.** Named cells and geometry validation.
- **T07 Calculation plugin framework.** Preflight/run/history/compare/protocol.
- **T08 Projection method.** Network averaging, ore ratio, hurricane cuts.
- **T09 Voronoi method.** Clipped cells, per-cell metrics, aggregate.
- **T10 Interval registry method.** Balance and technological off-balance.
- **T11 Geostatistical method.** Accepted fields/grid integration.
- **T12 Method compare/active result.** No overwrite, approval trail.
- **T13 Reserve plan.** Layers, labels, isolines/fill, layouts/export.
- **T14 Passport/approval/publication.** Immutable package.

### Acceptance

- golden datasets match approved expected results/rounding;
- each run records method/component/input hashes;
- changing intersection/block/condition marks run stale without mutation;
- all four methods produce comparable summary and method-specific protocol;
- active result selection and approval are separate permissions.

## 13. GEOX-E10 — 2D геологическое моделирование

**Приоритет:** P1.  
**Владелец UI:** geology entry + modeling workspace.

### Задачи

- **T01 Geological model project template/input snapshot.** Reserve/section inputs.
- **T02 Data/grid domain editor.** Nested regions, axis, faults/breaklines.
- **T03 Mesh preview/materialize/inspect.** Constraints and diagnostics.
- **T04 Variable/source data.** Points, include/exclude, support objects.
- **T05 Histogram/statistics/validation.** Transform/rejection with audit.
- **T06 Variogram cloud.** Directions, lag, tolerance, bandwidth.
- **T07 Variogram model fit.** Nested models, isotropy/anisotropy.
- **T08 Cross-validation.** Metrics, residuals, acceptability decision.
- **T09 Interpolation plugins.** Kriging, IDW, min curvature, Sibson/Laplace.
- **T10 Search parameters and jobs.** Negative-weight policy.
- **T11 Field review/accept.** Coverage/no-data/quality mask.
- **T12 Geological environment/ore contours.** Thresholds and reserve handoff.
- **T13 2D/volume views and exports.**

### Acceptance

- no field accepted without source, method, parameters and cross-validation;
- grid/domain/result versions are independent and traceable;
- reserve project references accepted field version, not mutable project;
- alternative methods compare on locked scale and same snapshot.

## 14. GEOX-E11 — 3D геологическая модель и DGM

**Приоритет:** P2, обязательный конечный scope.

### Задачи

- **T01 Horizon dictionary/order and constraints.**
- **T02 Section-based picks/corridor.** Well and fractional pinch-out picks.
- **T03 Roof/thickness surface runs.** Review and conflict diagnostics.
- **T04 Plan constrained triangulation.** Area/angle/mandatory nodes.
- **T05 Prismatic volume mesh.** Horizon clipping/max vertical edge.
- **T06 Mesh inspector.** Nodes/triangles/prisms/groups.
- **T07 Horizon groups.** Permeable/impermeable and custom.
- **T08 3D data analysis/variography.** Search ellipsoid.
- **T09 3D field runs.** Content and technological type.
- **T10 DGM composition.** Accepted field by group/quantity.
- **T11 Plan slices/averages/integrals.**
- **T12 3D isosurfaces/slices/section planes.** GPU and fallback.
- **T13 Versioned export and publication.**

### Acceptance

- horizon order violations are errors or explicit reviewed exceptions;
- mesh inspector reproduces element coordinates and memberships;
- DGM refers only to accepted distribution versions;
- slice/isosurface selection is shareable in URL;
- fallback table/2D slice available without WebGL.

## 15. GEOX-E12 — publication, integrations и hardening

**Приоритет:** P0 for publication, P1/P2 for full hardening.

### Задачи

- **T01 Geology package composer.** Scope, versions, consumers, limitations.
- **T02 Approval/reauth/signature placeholder.** RACI and return flow.
- **T03 Consumer contracts.** Technology/modeling/analytics exact version refs.
- **T04 Withdraw/replacement.** Notifications and audit.
- **T05 Report/export history.** Retention and permissions.
- **T06 Localization.** RU/KZ/EN messages and scientific terminology.
- **T07 Accessibility.** Keyboard, labels, reduced motion, non-color cues.
- **T08 Performance.** Real-volume budgets, LOD, virtualization, load tests.
- **T09 Security.** File scanning, expression sandbox, sensitive export.
- **T10 Browser/responsive.** Approved browser matrix, 1440/1024 and limited mobile.
- **T11 End-to-end regression.** Well→section→reserve→model→publication.
- **T12 Documentation/help migration.** Context help per workspace.

### Acceptance

- consumer opens exact published version/run;
- withdrawal keeps history and replacement link;
- full E2E works without decorative action or manual DB step;
- accessibility/performance/security gates are recorded and passed;
- implementation status, screen catalog, flows, module docs and traceability are current.

## 16. Cross-epic technical backlog

| ID | Задача | Когда обязательна |
|---|---|---|
| GEOX-X01 | Storybook scientific workbench states | E01 onward |
| GEOX-X02 | deterministic connected geological fixture generator | E02 |
| GEOX-X03 | Zod/OpenAPI contract generation | E01 |
| GEOX-X04 | WebSocket/SSE job client + polling fallback | E01/E05 |
| GEOX-X05 | common artifact manifest/checksum | E07 |
| GEOX-X06 | geometry invariant/golden test library | E08/E09 |
| GEOX-X07 | calculation golden dataset harness | E09/E10/E11 |
| GEOX-X08 | visual regression for columns/sections/plans | E07–E09 |
| GEOX-X09 | WebGL capability/fallback matrix | E11 |
| GEOX-X10 | migration/compatibility adapter for current demo routes | E01–E06 |

## 17. Приоритет ближайших задач

Первые десять задач реализации в строгом порядке:

1. GEOX-E00-T02 formula specification ownership;
2. GEOX-E01-T01 domain split;
3. GEOX-E01-T02 repository boundary;
4. GEOX-E01-T03 version commands/conflicts;
5. GEOX-E01-T04 dependency/stale graph;
6. GEOX-E01-T05 quantities/units;
7. GEOX-E01-T06 generalized interval engine;
8. GEOX-E02-T01/T02 deposit and conditions;
9. GEOX-E02-T04/T05 full well wizard/passport;
10. GEOX-E03-T01/T03 trajectory sets and calculation.

UI разрезов, запасов и 3D нельзя объявлять готовым до соответствующих domain/job contracts, даже если нарисован canvas.






