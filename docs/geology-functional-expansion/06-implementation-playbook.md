# Процесс реализации геологического расширения

## 1. Назначение

Этот документ задаёт повторяемый порядок работы для разработчика или AI-агента. Он предотвращает три типовые ошибки: повторный анализ PDF, реализацию изолированного экрана без доменного результата и объявление demo-механики production-функцией.

### 1.1. Обязательный режим текущей поставки

Текущий этап — кликабельный демонстрационный сайт, а не production-система.

- Все данные synthetic и загружаются через deterministic seed.
- Все изменения сохраняются через typed repositories в IndexedDB `kapgeo-demo`.
- Каждый task проверяет persistence после reload и глобальный reset.
- Импорт, расчёт, integration, export и approval могут быть deterministic simulations, но primary actions обязаны создавать сохраняемый result/job/artifact.
- Нельзя добавлять production backend, секреты, реальную ЭЦП или промышленный security/performance scope без отдельного решения пользователя.
- Авторитетный backlog — `05-prototype-epics-backlog.md`; прежний roadmap используется только как future reference.
## 2. Что читать в начале сессии

Обязательно:

1. корневой `AGENTS.md`;
2. `docs/README.md`;
3. `docs/ui-ux/01-product-brief.md`;
4. `docs/implementation-status.md`;
5. `docs/geology-functional-expansion/README.md`;
6. нужный эпик в `05-prototype-epics-backlog.md`;
7. соответствующий раздел `03-target-product-specification.md`;
8. соответствующие contracts в `04-target-architecture-integration.md`;
9. строки источника в `07-traceability-matrix.md`;
10. `08-open-questions-decisions.md`, если задача затрагивает формулу или незакрытое решение.

PDF и каталог `screenshots/` не перечитывать целиком. Открывать конкретную страницу/рисунок только если матрица указывает неоднозначность, которую нельзя разрешить по Markdown-спецификации.

## 3. Выбор vertical slice

Один срез должен заканчиваться наблюдаемым пользовательским исходом. Хороший срез:

`route → query/load → user action → validation → command/job → stored result/version → diff/status/audit → test`.

Плохой срез:

- «добавить все типы» без route и поведения;
- «нарисовать страницу запасов» без calculation run;
- «добавить кнопку экспорт» без artifact;
- «сделать 3D» без domain/mesh/result contract.

### Шаблон формулировки

```text
Как <permission/scope>, я могу <действие> над <точной версией объекта>,
чтобы получить <сохраняемый/проверяемый результат>.

Готово, когда:
- ...
```

## 4. Definition of Ready

Задача готова к реализации, если:

- указан GEOX epic/task ID;
- определён экран/route и пользователь/permission;
- известны входные/выходные entities и versions;
- описаны units/missing/provenance;
- определены errors/warnings и downstream impact;
- формула/алгоритм подтверждены или заменены безопасной demo-механикой с явной маркировкой;
- есть acceptance и тестовый fixture;
- нет блокирующего OPEN без owner/default decision.

Если расчётная формула не подтверждена, разрешено реализовать UI/contract/preflight, но нельзя создавать правдоподобный «production result».

## 5. Пошаговый процесс разработки

### Шаг 1. Зафиксировать фактическое состояние

- проверить `git status` и не затрагивать пользовательские изменения;
- найти route/page/entity/repository/test через `rg`;
- проверить, что указанное в `implementation-status.md` поведение существует;
- записать текущие ограничения в рабочий план.

### Шаг 2. Определить предметный контракт

До JSX определить:

- entity/aggregate ID;
- version and status;
- command/query schema;
- interval/geometry/quantity policy;
- source/provenance;
- dependency references;
- expected failure modes.

Если контракт общий, сначала добавить его в `shared/scientific` или repository contracts и покрыть unit test.

### Шаг 3. Подготовить связный synthetic fixture

Fixture должен:

- использовать только явно synthetic names/coordinates/values;
- иметь стабильные IDs и seed;
- связывать well → survey/log/core/sample → section → reserve/model;
- содержать минимум один valid, warning, error, stale и version-conflict case;
- удовлетворять invariant tests;
- не содержать production credentials/real personal data.

Не встраивать fixture прямо в page component.

### Шаг 4. Реализовать repository/query слой

- добавить query/list/detail contract;
- добавить предметную command, а не generic mutation;
- принимать `expectedVersion` и `idempotencyKey`;
- возвращать typed `ApiProblem`;
- обновлять query cache только после результата repository;
- для job вернуть `jobId`, затем обновлять состояние через job client;
- demo implementation должна имитировать те же states/errors, что production contract.

### Шаг 5. Реализовать route и URL-state

- typed path/search params;
- scope/object/version/tab/view/selection where applicable;
- permission guard;
- loading/error/not-found/forbidden/read-only;
- deep link восстанавливает selection и inspector;
- Back/Forward не теряют сохранённый контекст.

### Шаг 6. Собрать UI из переиспользуемых primitives

Порядок:

1. Page header и exact object/version/status.
2. Primary registry/workspace.
3. Selection synchronization.
4. Inspector/evidence.
5. Validation/issues.
6. Commands and confirmation.
7. Diff/audit/result state.

Цвета и spacing — только semantic tokens. Canvas имеет legend и non-color cues.

### Шаг 7. Реализовать доменное действие

Для любого edit:

- draft/original visibly separated;
- undo/redo within draft;
- inline issue + summary issue list;
- destructive/bulk action показывает affected items;
- save показывает diff and reason where policy requires;
- conflict предлагает reload/compare/clone, не молча перезаписывает;
- successful command даёт visible result/status/audit.

### Шаг 8. Учесть dependencies

Если изменяется upstream field:

- показать impact preview до save;
- после save создать stale markers;
- дать links to affected artifacts;
- не запускать expensive rerun автоматически;
- не изменять old publication.

### Шаг 9. Добавить тесты

Минимум:

- unit: правила интервалов/единиц/статуса/геометрии/формулы;
- repository/contract: success, validation, conflict, permission and idempotency;
- component: loading/empty/error/read-only/edit/save;
- route integration: deep link and search state;
- e2e: один happy path и один blocking failure;
- visual: scientific canvas at 1440 and 1024 where changed;
- accessibility: keyboard sequence and semantic labels.

Расчётная задача дополнительно требует golden dataset and reproducibility test.

### Шаг 10. Проверить и обновить документацию

После material milestone:

- `docs/implementation-status.md` — что действительно работает и ограничения;
- `docs/ui-ux/04-screen-catalog.md` — новый/изменённый экран;
- `docs/ui-ux/modules/02-geology.md` — изменённый предметный процесс;
- `docs/ui-ux/05-cross-module-flows.md` — новая transition/dependency;
- `docs/ui-ux/09-roadmap-backlog.md` и этот задачник — status;
- `docs/ui-ux/11-traceability-open-questions.md`/`08-open-questions-decisions.md` — решение/OPEN;
- `07-traceability-matrix.md` — implementation status/evidence.

## 6. Definition of Done

Задача завершена, когда:

- acceptance выполнена на уровне поведения;
- нет декоративных primary actions;
- source/version/provenance visible;
- validation и conflict работают;
- loading/empty/error/forbidden/read-only/stale states доступны;
- permissions проверены route и action level;
- test suite proportional to risk passed;
- `npm run typecheck`, `npm run test`, `npm run build` успешны после frontend change;
- manual/browser verification recorded;
- документация отражает реальную, а не запланированную готовность;
- demo/production граница явно указана.

### 6.1. Дополнительный IndexedDB gate

До закрытия любой задачи проверить:

- запись создана через repository, а не component state;
- reload восстанавливает exact demo-state;
- reset удаляет пользовательское изменение и возвращает seed;
- schema/seed version сохраняются в `meta`;
- audit/job/artifact создаются в одной логической transaction, где это требуется;
- тест использует изолированную demo database и очищает её после выполнения;
- UI явно отличает synthetic/demo result от утверждённого производственного результата.

Эпик нельзя закрывать, если хотя бы одна его primary flow теряется после reload или переживает reset ошибочно.
## 7. Порядок миграции текущих геологических routes

### 7.1. Этап 1 — repository seam

1. Создать repository interfaces.
2. Обернуть текущие in-memory функции demo implementation.
3. Перевести существующие query hooks без визуального изменения.
4. Добавить contract tests.
5. Только затем делить domain types.

### 7.2. Этап 2 — current well tabs

Очередность:

1. `overview/passport`;
2. `drilling/core`;
3. `lithology`;
4. `samples/lab`;
5. `logs/viewer`;
6. placeholder tabs `technology/documents/audit`.

Каждая вкладка переходит на отдельный aggregate query. `WellDetailsPage` становится container/router, а не владельцем предметного состояния.

### 7.3. Этап 3 — hard-coded standalone pages

1. `/geology/correlation` → SectionProject fixture/repository;
2. `/geology/reserves` → ReserveProject fixture/repository;
3. `/geology/delivery` → Publication package fixture/repository;
4. исправить canonical screen labels: GEO-22/24, GEO-27–30, GEO-34.

### 7.4. Этап 4 — new routes

Добавлять по dependencies: deposits/conditions → trajectory/core → logs/interpretation → columns/map → sections → reserves → 2D/3D.

## 8. Правила научных редакторов

### 8.1. Selection и cursor

- один stable `selectionId`;
- table/canvas/inspector update bidirectionally;
- hover не заменяет selection;
- keyboard selection visible;
- cursor depth/elevation shown with unit and datum;
- zoom не меняет значение data.

### 8.2. Undo/redo

- только unsaved draft operations;
- clear after successful save or explicit reset;
- не отменяет workflow/job/publication;
- operation log должен быть детерминирован и тестируем.

### 8.3. Snap

- target type visible;
- tolerance configurable/policy-driven;
- preview показывает old/new coordinates;
- Alt/explicit toggle disables where permitted;
- silent snap запрещён.

### 8.4. Auto-repair/auto-interpret

- выполняется как proposal/preview;
- перечисляет changed/removed/created items;
- accept применяет одним атомарным command;
- reject не меняет draft;
- algorithm/component version записывается.

## 9. Расчётные задачи

Перед merge расчётной функции проверить:

1. formula specification and version;
2. canonical units and conversions;
3. rounding/precision;
4. empty/missing/zero/negative behavior;
5. geometry clipping/tolerance;
6. deterministic ordering/tie-break;
7. golden fixtures including edge cases;
8. input/output hashes;
9. independent reviewer result;
10. protocol artifact.

Клиентский preview может использовать approximation, но UI обязан маркировать его и authoritative result приходит только от calculation run.

## 10. Документы и визуальные артефакты

Для колонки/разреза/плана:

- view template version отделена от data snapshot;
- preview использует тот же scene manifest, что server render;
- visual regression сравнивает approved fixture;
- экспорт содержит manifest и checksum;
- locale/font availability проверяются;
- page selection/rotation/crop сохраняются как export request, не меняют source layout;
- repeat download берёт существующий artifact.

## 11. Нельзя делать

- читать/сканировать `archive/` без отдельного разрешения и точного источника;
- переписывать formula из OCR без ручной проверки;
- добавлять raw SQL пользователю;
- использовать role-name checks вместо permissions;
- хранить новый production-like результат только в component state;
- смешивать manual/AI/accepted intervals;
- менять published version in place;
- создавать второй mesh/variogram engine в geology;
- показывать synthetic calculation как фактический;
- объявлять screen complete, если button only changes label/toast.

## 12. Формат handoff следующей сессии

В конце незавершённой задачи оставить:

```text
Активный epic/task:
Цель slice:
Что реализовано и проверено:
Какие файлы изменены:
Какие contracts/fixtures добавлены:
Оставшиеся шаги:
Блокирующие OPEN:
Команды проверки и результат:
Документы, которые обновлены/ещё нужно обновить:
```

Не писать «почти готово». Указывать точные работающие действия и ограничения.

## 13. Чек-лист ревью pull request

### Предметность

- [ ] Источник/эпик/acceptance указаны.
- [ ] Термины и units canonical.
- [ ] Missing/zero/qualifier различаются.
- [ ] Formula/algorithm versioned.

### Данные

- [ ] Stable IDs и versions.
- [ ] Provenance/evidence.
- [ ] Dependency impact/stale.
- [ ] No mutation of published data.

### UX

- [ ] Table/canvas/inspector synchronized.
- [ ] Keyboard and non-color state.
- [ ] Required route states.
- [ ] URL restores context.

### Техническое качество

- [ ] FSD direction preserved.
- [ ] Page has no hard-coded domain result.
- [ ] Command handles conflict/idempotency.
- [ ] Jobs/diagnostics honest.
- [ ] Typecheck/test/build pass.

### Документация

- [ ] Implementation status accurate.
- [ ] Screen/flow/module/backlog updated where required.
- [ ] Traceability/evidence current.
