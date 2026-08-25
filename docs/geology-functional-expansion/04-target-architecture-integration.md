# Целевая архитектура и интеграция в текущий прототип

## 1. Архитектурное решение

Расширение реализуется как набор вертикальных доменных срезов внутри существующей зависимости слоёв:

`app → pages → widgets → features → entities → shared`.

Нельзя продолжать наращивать `WellDetailsPage` и `src/repository/api.ts` условными ветками. Перед предметным расширением требуется выделить:

- typed transport contracts;
- repositories по aggregate;
- version/snapshot/dependency services;
- shared scientific workbench primitives;
- background job API;
- spatial/calculation/report adapters.

### 1.1. Архитектура текущего prototype-этапа

Для текущих 13 эпиков production transport/storage заменяются единым browser-only контуром:

`React pages → typed repositories → IndexedDB adapter → kapgeo-demo`.

- GitHub Pages раздаёт только статическую сборку.
- IndexedDB является единственным сохраняемым источником demo-state.
- Pages/features не используют IndexedDB API напрямую.
- Все исходные данные создаются deterministic seed; реальные производственные данные запрещены.
- DemoDatabase содержит stores `meta`, `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`, `preferences`.
- Imports/calculations/renders/integrations работают как client-side deterministic simulations и сохраняют результат в тех же stores.
- `DemoDatabase.reset()` удаляет локальную базу и повторно применяет seed.
- HTTP adapters, transactional server DB, PostGIS, object storage, SSE/WebSocket и server renderer ниже описывают future-production boundary и не входят в текущий DoD.

Авторитетная task-декомпозиция prototype-этапа находится в `05-prototype-epics-backlog.md`.
## 2. Границы bounded contexts

| Контекст | Владеет | Не владеет |
|---|---|---|
| Geological master data | deposit/site/condition/dictionaries | users/integration credentials |
| Well data | passport, trajectory, drilling, core, logs, samples, construction | section/reserve calculation |
| Interpretation | lithology/stratigraphy/tech/ore interpretations, manual/AI resolution | raw file storage |
| Section | profile route, picks, connectivity, contours, drawing snapshot | source well edits |
| Reserves | ore intersections, blocks, methods, plans, approvals | interpolation engine internals |
| Geological modeling workflow | geological input definition and accepted geological result | generic grid/job/render implementation |
| Modeling engine | domains, meshes, fields, variography, interpolation, 2D/3D result | business approval of geology/reserves |
| Platform data | documents, imports, exports, jobs, audit, workflow | subject formulas |

## 3. Frontend decomposition

### 3.1. Pages

Предлагаемые route families:

```text
/geology
/geology/deposits
/geology/deposits/:depositId
/geology/deposits/:depositId/conditions/:conditionSetId
/geology/map
/geology/wells
/geology/wells/new
/objects/wells/:wellId?tab=...
/geology/logs
/geology/logs/import
/geology/logs/:logRunId
/geology/interpretations/:interpretationId/:mode
/geology/columns/:wellId
/geology/templates/columns
/geology/sections
/geology/sections/new
/geology/sections/:sectionId/:workspace
/geology/reserves
/geology/reserves/:projectId/:workspace
/geology/reserves/blocks/:blockId
/geology/reports
/geology/delivery
/modeling/projects/:projectId?context=geology
```

`workspace` для разреза: `route`, `horizons`, `rhythm`, `ore`, `oxidation`, `drawing`, `versions`.

`workspace` для запасов: `intersections`, `blocks`, `calculations`, `compare`, `plan`, `approval`.

### 3.2. Widgets

- `GeologyContextBar`;
- `WellCompletenessPanel`;
- `DepthWorkbench`;
- `LogTrackCanvas`;
- `SectionWorkbench`;
- `SpatialWorkbench`;
- `ReserveWorkbench`;
- `ScientificRunPanel`;
- `DependencyImpactPanel`;
- `VersionEvidencePanel`;
- `DrawingComposer`;
- `ReportPreview`.

### 3.3. Features

Примеры feature slices:

- `create-well-version`;
- `import-log-run`;
- `nominate-main-survey`;
- `transform-log-curve`;
- `merge-log-curves`;
- `edit-depth-intervals`;
- `interpret-core-depth`;
- `resolve-ai-interpretation`;
- `edit-section-route`;
- `connect-section-intervals`;
- `edit-reserve-block`;
- `run-reserve-calculation`;
- `accept-geological-field`;
- `generate-geology-report`;
- `publish-geology-package`.

### 3.4. Entities

Не создавать один barrel с сотнями связанных типов. Минимальные entity packages:

```text
entities/deposit
entities/condition-set
entities/well
entities/well-trajectory
entities/drilling-run
entities/core
entities/geological-interval
entities/log-run
entities/log-curve
entities/sample
entities/interpretation
entities/column-template
entities/section
entities/ore-body
entities/reserve-project
entities/reserve-block
entities/calculation-run
entities/geological-model
entities/publication
```

## 4. Доменная модель

### 4.1. Общий version envelope

```ts
type DomainVersion<T> = {
  id: string
  objectId: string
  version: number
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'superseded' | 'withdrawn'
  basedOnVersionId?: string
  effectiveFrom?: string
  createdAt: string
  createdBy: ActorRef
  reason?: string
  data: T
  quality: QualitySummary
  dependencies: DependencyRef[]
  contentHash: string
}
```

`expectedVersion` передаётся каждой mutating command. При конфликте API возвращает `409 VERSION_CONFLICT` с current version and compare link.

### 4.2. Измерение и происхождение

```ts
type MeasuredValue = {
  quantityId: string
  value?: number
  unitId: string
  qualifier?: 'lt' | 'lte' | 'gt' | 'gte' | 'approx'
  missingReason?: string
  uncertainty?: number
  source: SourceRef
  method?: MethodRef
  observedAt?: string
}
```

Оригинал импортированного значения не заменяется converted value. Conversion хранится как derived representation с rule version.

### 4.3. Скважина

`Well` содержит только идентичность и ссылки на действующие aggregate versions. Детальные payload загружаются раздельно:

- `WellPassportVersion`;
- `WellConstructionVersion`;
- `WellTrajectorySurvey/Version`;
- `DrillingProgramVersion`;
- `CoreDepthModelVersion`;
- `GeologicalTrackVersion` by track type;
- `SampleBatch/Version`;
- `LogRun/LogCurveVersion`;
- `WellDocument`;
- `WellColumnLayoutVersion`.

Это позволяет независимо редактировать ГИС и пробы без конфликта со всей карточкой.

### 4.4. Интервалы

```ts
type DepthInterval<T> = {
  id: string
  from: number
  to: number
  depthDomain: 'measured' | 'drilling' | 'composite' | 'true_vertical'
  attributes: T
  sourceRefs: SourceRef[]
  createdByOperation?: OperationRef
}
```

Policies задаются для каждого track type:

- overlap `forbidden/allowed-by-category/allowed`;
- gap `error/warning/allowed`;
- coverage range;
- merge equivalence;
- snap resolution;
- minimum thickness.

### 4.5. Геометрия и CRS

Внутренний spatial contract не хранит координаты отдельно от системы координат. `Point`, `LineString` и `Polygon` используют общий versioned document `kapgeo.geometry/v1` с явными `CRS id/authority/code/kind/unit/axisOrder`. Допустимы только 2D/3D positions одной размерности.

Foundation `shared/scientific/geometry/` обеспечивает:

- конечность координат и geographic range для `EPSG:4326`;
- минимальное число точек, closure, zero-length/zero-area и self-intersection;
- containment и взаимное пересечение polygon holes;
- bounds, metric length/area только для CRS с метрической единицей;
- deterministic serialization/deserialization с position limit;
- compatibility mapping старого `XY + crs string` на `SpatialPoint`;
- обязательный `GeometryTransformAdapter` для преобразования между разными CRS.

До решения `GEOX-OQ-50` foundation не выполняет приближённую или скрытую перепроекцию. Вызов transform без утверждённого adapter завершается typed error `CRS_TRANSFORM_UNAVAILABLE`. Drawing annotations и view coordinates не должны сохраняться как scientific geometry.

### 4.6. Кривые

Метаданные хранятся реляционно/документно, samples — chunked columnar object storage.

```text
LogRun → LogCurveVersion → CurveChunk[]
                      ↘ lineage/source curves
```

`CurveChunk` индексируется по depth range и downsample level. Viewer запрашивает только visible range/resolution. Raw file хранится неизменяемо.

### 4.7. Section aggregate

```text
SectionProject
  ├─ InputSnapshot
  ├─ ProfileRouteVersion → Segment[]
  ├─ SectionWell[]
  ├─ TechConnectivityVersion → Connection[]/HelperInterval[]
  ├─ RhythmBoundaryVersion
  ├─ OreBodyVersion
  ├─ OxidationZoneVersion
  └─ DrawingLayoutVersion[]
```

Scientific geometry и drawing annotations разделены. Moving a label не меняет OreBodyVersion.

### 4.8. Reserves aggregate

```text
ReserveProject
  ├─ ReserveInputSnapshot
  ├─ OrePackageVersion
  ├─ ReserveIntersectionVersion
  ├─ ReserveBlockVersion
  ├─ ReserveCalculationRun[]
  ├─ ActiveResultSelection
  ├─ ReservePlanLayoutVersion[]
  └─ Approval/Publication
```

`ReserveCalculationRun` хранит plugin ID/version, parameters, input hash, results, spatial artifacts, warnings, logs и protocol artifact.

## 5. API contracts

### 5.1. Общий envelope

```ts
type ApiEnvelope<T> = {
  data: T
  meta: {
    requestId: string
    serverTime: string
    version?: string
    warnings?: ApiWarning[]
  }
}
```

Ошибки используют `ApiProblem`: `code`, `title`, `detail`, `requestId`, `fieldErrors`, `affectedIds`, `retryable`.

### 5.2. Query families

| Семейство | Примеры |
|---|---|
| Deposits | `GET /deposits`, `/deposits/:id`, `/condition-sets` |
| Wells | `GET /wells`, `/wells/:id/summary`, `/versions`, `/dependencies` |
| Well aggregates | `/passport`, `/construction`, `/trajectory`, `/core`, `/tracks`, `/samples` |
| Logs | `/log-runs`, `/curves/:id/metadata`, `/curves/:id/samples?from&to&resolution` |
| Interpretations | `/interpretations`, `/intervals`, `/compare`, `/issues` |
| Sections | `/sections`, `/route`, `/wells`, `/connectivity`, `/ore-bodies`, `/drawings` |
| Reserves | `/reserve-projects`, `/intersections`, `/blocks`, `/runs`, `/plans` |
| Modeling | `/model-projects`, `/domains`, `/meshes`, `/fields`, `/variograms`, `/runs` |
| Platform | `/imports`, `/jobs`, `/exports`, `/reports`, `/workflow`, `/audit` |

### 5.3. Commands

Commands должны быть предметными, а не generic `PUT object`:

```text
POST /wells/:id/versions
POST /well-versions/:id/nominate-main-trajectory
POST /log-curves/:id/transforms
POST /log-curves/merge-jobs
POST /interpretations/:id/apply-auto-tech-preview
POST /sections/:id/connect-intervals
POST /sections/:id/repair-proposal
POST /reserve-projects/:id/calculation-runs
POST /calculation-runs/:id/accept
POST /geology-publications
```

Каждая command принимает `idempotencyKey`, `expectedVersion`, reason и при необходимости issue acknowledgements.

## 6. Jobs и вычислительные компоненты

### 6.1. Типы jobs

- file parsing/import;
- curve transform/merge/downsampling;
- trajectory calculation;
- column/section/reserve-plan rendering;
- section topology repair preview;
- reserve calculation;
- 2D/3D mesh generation;
- histogram/variography/cross-validation;
- interpolation/field materialization;
- DGM composition;
- PDF/XLSX/SVG/DXF/SHP export.

### 6.2. Job contract

```ts
type ScientificJob = {
  id: string
  type: string
  state: 'queued' | 'running' | 'post_processing' | 'succeeded' | 'failed' | 'cancelled'
  stage: string
  progress?: { completed: number; total: number; unit: string }
  inputSnapshotId: string
  component: { id: string; version: string }
  createdBy: ActorRef
  resultRefs: ArtifactRef[]
  problem?: ApiProblem
}
```

Не показывать процент, если backend знает только stage. WebSocket/SSE используется для обновлений, polling — fallback.

### 6.3. Calculation plugin interface

```ts
#### Реализованный foundation-срез T08 — 21.08.2026

- domain contract и проверяемый lifecycle находятся в `shared/scientific/jobs`; terminal states immutable, determinate progress конечен и монотонен, stage-only job не принимает `completed/total`;
- repository boundary имеет deterministic in-memory demo и HTTP adapter; create принимает idempotency key, retry создаёт новую попытку с `parentJobId` и тем же input snapshot;
- общий React client на TanStack Query объединяет list/create/poll/cancel/retry и обновляет единый cache;
- `JobStatusCard` и глобальный monitor показывают stage, честный progress, typed problem, diagnostics, result refs и допустимые команды;
- home использует тот же cache, а LAS/DAT wizard создаёт `file_import` job вместо мгновенного фиктивного результата;
- demo polling пошагово воспроизводит выполнение и предназначен только для прототипа.

Production-граница не изменена: backend должен хранить jobs и историю, исполнять команды идемпотентно и доставлять обновления по SSE/WebSocket с polling fallback. Текущий HTTP adapter описывает transport contract, но не означает наличие production endpoint.

interface ReserveMethodPlugin {
  id: string
  version: string
  inputSchemaVersion: string
  preflight(snapshot: ReserveInputSnapshot): ValidationReport
  run(snapshot: ReserveInputSnapshot, params: unknown): ReserveResult
  renderProtocol(result: ReserveResult): ArtifactRef
}
```

Формулы не располагаются в React-коде. UI получает schema, descriptions, units и result model от versioned method definition.

## 7. События и dependency graph

### 7.1. Доменные события

Минимальный набор:

```text
ConditionSetPublished
WellVersionPublished
MainTrajectoryChanged
LogCurveVersionPublished
InterpretationPublished
SectionPublished
ReserveBlockPublished
ReserveCalculationAccepted
GeologicalFieldAccepted
GeologyPackagePublished
PublicationWithdrawn
```

### 7.2. Реакция на событие

Event processor:

1. находит DependencyRef по exact version;
2. создаёт `StalenessRecord` с причиной;
3. уведомляет owner/reviewer;
4. предлагает rerun/rebase, но не запускает его автоматически;
5. сохраняет опубликованный старый результат доступным для audit.

### 7.3. IndexedDB repository contract текущего этапа

Каждый aggregate repository предоставляет одинаковые demo-capabilities:

- initialize/seed;
- list/get;
- command с expectedVersion/idempotencyKey;
- transaction для record/version/relation/audit;
- scenario-controlled conflict/error;
- export demo snapshot;
- reset всей базы.

Scientific arrays в прототипе намеренно малы: curve chunks, mesh и fields сохраняются как bounded synthetic records/artifacts. Это демонстрирует UX и contracts, но не является доказательством production performance.
## 8. Хранение

| Данные | Рекомендуемое хранение |
|---|---|
| master data, metadata, workflow, versions | transactional DB |
| геометрии и spatial queries | PostGIS-compatible layer |
| raw LAS/DAT/docs/media | object storage with checksum/version |
| curve samples | columnar chunks/object storage + metadata index |
| mesh/field arrays | chunked scientific storage, object store |
| derived thumbnails/tiles | cache/CDN or internal tile store |
| audit | append-only storage |
| reports/exports | immutable artifact storage with retention policy |

Конкретный vendor остаётся архитектурным решением; frontend не должен зависеть от него.

## 9. Scientific canvas и rendering

### 9.1. Общий scene model

Карта, depth tracks, section, reserve plan и 3D используют разные renderers, но общий interaction contract:

- stable scene object ID;
- selection/hover/focus;
- viewport and coordinate transform;
- visible layers;
- snapping diagnostics;
- command dispatch;
- accessible list/table projection;
- export scene snapshot.

### 9.2. Renderer choices

- DOM/SVG: небольшие таблицы, легенды, vector print scene;
- Canvas/WebGL: кривые, большие point/line layers, heatmaps;
- 3D WebGL: mesh/surfaces/isosurfaces/slices;
- server renderer: authoritative SVG/PDF/DXF and high-resolution outputs.

Renderer не содержит доменную формулу. Он получает prepared scene data.

### 9.3. Performance targets для проектирования

Точные объёмы требуют подтверждения, но интерфейс проектируется с virtualization/chunking:

- registry: server-side paging/filtering;
- curve: visible-range LOD and downsampling;
- interval table: row virtualization after threshold;
- section/map: spatial culling and simplified geometry by zoom;
- mesh/field: tiled/chunked loading;
- report: background render and cached preview pages.

Targets нельзя фиксировать числом до ответа на OQ об объёмах; performance budgets добавляются после профилирования реальных datasets.

## 10. Import/export architecture

### 10.1. Import adapter

```text
raw file → format detector → parser profile → canonical staging rows
→ mapping → validation → preview/diff → apply command → source/version
```

Parser profile version и checksum файла обязательны. Partially succeeded import хранит rejected rows и protocol.

### 10.2. Export/report

```text
object/version + layout/template + locale + parameters
→ export job → immutable artifact + manifest + checksum
```

Manifest включает source versions, generatedAt/by, template/component version и ограничения. Повторная загрузка не пересчитывает документ.

## 11. Безопасность

- координаты и массовый экспорт могут иметь отдельную permission/policy;
- raw files сканируются и не исполняются;
- expression language не допускает произвольный код/IO/network;
- sensitive logs redacted by permission;
- approval может требовать reauth;
- object storage использует short-lived authorized download;
- audit содержит actor, effective permissions/scope, request ID, before/after hashes;
- никаких production credentials в fixtures или frontend bundle.

## 12. Интеграция с существующим кодом

### 12.1. Сохранить

- `src/app/router.tsx` как router composition point, но вынести geology subtree;
- существующие page containers как временные route adapters;
- interval validation tests/primitives после обобщения;
- URL search validators;
- common cards, status, inspector and workflow components;
- deterministic synthetic data policy.

### 12.2. Рефакторить до расширения

| Сейчас | Цель |
|---|---|
| `src/entities/well/model/types.ts` содержит все типы | split entities and shared measurement/interval types |
| `src/repository/api.ts` — единый in-memory facade | repository interfaces + demo/HTTP implementations |
| hard-coded page data | query-backed fixture repositories |
| monolithic well tabs | lazy workspace registry by tab/permission |
| local calculation in component | command/job client |

### 12.3. Предлагаемая структура

```text
src/
  app/router/geology-routes.tsx
  pages/geology/...
  widgets/geology/depth-workbench/
  widgets/geology/section-workbench/
  widgets/geology/reserve-workbench/
  features/geology/...
  entities/geology/...
  shared/scientific/intervals/
  shared/scientific/quantities/
  shared/scientific/geometry/
  shared/scientific/jobs/
  shared/scientific/scene/
  repository/contracts/
  repository/demo/
  repository/http/
```

Не создавать `shared/geology`; предметная логика остаётся в entities/features геологии.

## 13. Миграция demo-данных

1. Зафиксировать текущий synthetic dataset snapshot и сценарии.
2. Ввести stable IDs для deposit/well/version/source.
3. Разделить current well payload на aggregate fixtures.
4. Добавить migration adapter, чтобы старые pages временно читали новый repository.
5. Переводить по одному vertical slice на new contracts.
6. Удалять старое поле только после route/test migration.
7. Для каждого нового calculation создавать deterministic fake job/result с явной маркировкой, пока backend отсутствует.

## 14. Наблюдаемость и диагностика

Каждая ошибка импорта/расчёта/экспорта показывает:

- human-readable stage/problem;
- affected object/version;
- request/job/run ID;
- retryability;
- safe log excerpt;
- link to incorrect input/parameter;
- actions retry/clone/download diagnostic according to permission.

Метрики: job latency/failure by type/component, import rejection rate, stale backlog, approval lead time, report failure, viewer/render performance. Метрики не заменяют предметный QA.

## 15. Архитектурные quality gates

- no cross-import violating FSD direction;
- no raw scientific formula in React component;
- no mutating query without `expectedVersion`/idempotency;
- no accepted result without snapshot/component version;
- no raw file overwrite;
- no visual setting in scientific content hash;
- no canvas-only critical operation without accessible alternative;
- no downstream silent mutation on upstream event;
- contract, domain and invariant tests pass before UI completion.
