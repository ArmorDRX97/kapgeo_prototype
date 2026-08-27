# Статус реализации

Дата обновления: 25 августа 2026

Текущий этап: **GEOX — профессиональное расширение геологического модуля**

## Готово

- детально разобрано руководство пользователя геологического модуля объёмом 339 страниц и сопоставлены 199 извлечённых растровых иллюстраций;
- создан пакет `docs/geology-functional-expansion/`: функциональный реестр источника, gap-анализ, целевой процесс, архитектура интеграции, эпики, playbook реализации, трассировка и журнал решений;
- зафиксирована граница контекстов: ГЕО владеет геологическими данными, интерпретацией, запасами и приёмкой версии, а общий вычислительный контур 2D/3D, сеток, вариографии и интерполяции переиспользуется из МОД;
- настоящий milestone является документационным: работающий код прототипа на этом этапе не менялся, а перечисленные далее экраны сохраняют прежний demo-уровень;
- проанализирован исходный комплект и создана основная UI/UX-документация;
- определены 14 ролей, 159 экранов/рабочих областей и 12 сквозных процессов;
- описаны дизайн-система, frontend-архитектура, mock data и acceptance;
- настроена межсессионная точка входа через `AGENTS.md` и `docs/README.md`;
- тяжёлые исходники и одноразовые результаты анализа изолированы в `archive/`;
- создан React 19 + TypeScript 6 + Vite 8 проект;
- настроены TanStack Router/Query, Vitest, Testing Library, ESLint и строгая типизация;
- реализованы app shell, адаптивная навигация, дизайн-токены и базовый UI-kit;
- типографика приведена к читаемому минимуму: основной текст 14 px, служебный текст 12 px;
- реализована детерминированная demo-сессия с SSO, MFA (`246810`), 14 персонами и сохранением в `sessionStorage`;
- права влияют и на меню, и на прямой доступ к маршрутам;
- реализован вертикальный сценарий вход → главная → задача → карточка скважины → сравнение интерпретаций → обоснованное решение;
- добавлены mock API и синтетические данные скважин, задач и фоновых операций.
- GEO-03 вынесен в отдельную рабочую карту со слоями, legend, cross-selection и инспектором;
- GEO-04 поддерживает URL-фильтры, сохранённые demo-представления и перенос выборки между картой и реестром;
- GEOX-E01-T10 (phase 1+2) внедряет shared workspace между `/geology/map`, `/geology/wells` и `/objects/wells/$wellId`: единый `selectedWellId/workspaceFocus`, передача контекста в карточку, маршрутизация `tab` в URL и fallback-подбор при смене фильтрации.
- GEOX-E02 завершён как сохраняемый synthetic well-master: /geology/master редактирует месторождения, участки, залежи и effective-dated кондиции с version/audit; реестр скважин хранит группировку и saved views; wizard добавляет принадлежность, проект и spatial/duplicate check; полный паспорт разделён на пять независимых агрегатов, construction editor поддерживает intervals/points и undo/redo; review/publish доступен через demo-permissions (автор / согласующий / издатель); reload сохраняет результат в IndexedDB, а reset возвращает seed.
- GEOX-E03 завершён: вкладка ?tab=drilling использует versioned IndexedDB workspace траектории и керна — surveys, fixture import с mapping/diff/protocol, deterministic mean-angle/vertical-fallback result, job/artifact evidence, MD/TVD/N/E inspector, depth mapping core runs/bins/boxes, validation, preview relations к литологии/пробам, undo/redo и CSV export.
- GEOX-E04 завершён: вкладки литологии и проб используют versioned IndexedDB geology workspace: core/log/composite/stratigraphy tracks, RU/KZ/EN dictionaries, overrides, sample links и workflow, lab QA/QC, synthetic granulometry, batch labels/barcodes, LIMS staging/reconciliation, versions/relations/audit/jobs/artifacts.
- GEOX-E05 завершён: вкладка ГИС получила versioned IndexedDB workspace с synthetic LAS/DAT fixture, parser/mapping/QC preview, atomic LogRun/curve versions, bounded viewer, templates, derived/merged curves, main-curve impact, audit/jobs/artifacts.
- GEOX-E06 завершён: вкладка ГИС дополнена versioned workspace интерпретаций: manual permeable/filtration/differential/ore/tech tracks, automatic KS/align proposals, explicit preliminary/no-correction exclusion, synthetic AI evidence, human resolution и review/publish audit.
- GEOX-E07 завершён: вкладка документов использует versioned output workspace с SVG-column/template/annotations/legend, Blob-export preview, demo documents, GIS-like map edit и managed views.
- GEOX-E08 завершён: /geology/correlation получил versioned SectionProject workspace с route/corridor, connectivity, helpers, contours, ore/oxidation, auto-repair и downloadable drawing artifact.
- GEOX-E09 завершён: /geology/reserves получил versioned ReserveProject с intersections/blocks/well sets/cells, четырьмя synthetic methods на locked snapshot, compare, plan и passport publication.
- GEOX-E10 завершён: /modeling получил versioned 2D geology workspace с domain/grid, source points, statistics, variogram/CV, четырьмя interpolation plugins, accepted field/contours и JSON output.
- GEOX-E11 завершён: /modeling/results/$projectId получил versioned DGM workspace с horizons/picks/surfaces, prismatic mesh, 3D fields/composition, slices, WebGL/2D/table fallback и publication exports.
- GEO-05 расширен постановкой `UC.KAPGEO.BGD.03`: наряду с legacy-входом `/geology/wells/new` доступны вложенные страницы создания и редактирования скважины из карточки месторождения БГД;
- созданный demo-объект появляется в query cache и открывается как честная draft-карточка версии 1;
- набор скважин расширен до 10 связанных synthetic-объектов, добавлены unit-тесты фильтрации.
- вкладки единой карточки получили стабильное URL-состояние `?tab=`;
- GEO-06 содержит редактируемый паспорт и конструкцию с проверкой интервалов;
- GEOX-E01-T01…T04 разделили паспорт и конструкцию на независимые versioned aggregates и ввели repository contracts с demo/HTTP adapters;
- изменение координат, CRS, профиля, глубины, диаметра или конструкции показывает impact preview из графа точных зависимостей и требует причины;
- сохранение передаёт `expectedVersion` и `idempotencyKey`, создаёт новую demo-версию в статусе «На проверке» и возвращает request/audit evidence;
- конкурентное изменение возвращает `VERSION_CONFLICT` с актуальными версиями и действием перезагрузки вместо last-write-wins;
- зависимые разрез, модель и колонка после сохранения получают видимые `stale` records; исходные опубликованные версии не изменяются и остаются в истории;
- compatibility API возвращает независимые query snapshots: после сохранения заголовок карточки синхронно показывает новую версию и координаты, а ранее загруженный snapshot не мутируется;
- GEO-07 связывает таблицу рейсов с глубинным треком и инспектором выбранного интервала;
- GEO-08 показывает керновые коробки, хранение, фотографии и связь с пробами;
- overlap, gap, неверный диапазон и выход за глубину проверяются общей предметной функцией и unit-тестами.
- GEO-09 реализован как интерактивный редактор литологии/стратиграфии: колонка и таблица синхронизированы, доступны изменение границ, split/merge, copy, заполнение пропуска, undo/redo, diff и сохранение черновика;
- GEOX-E01-T05 добавляет canonical quantity/unit registry: совместимость размерностей, преобразование `м/см/мм`, `мг/кг/г/т/ppm/%`, `кг/м³/т/м³`, диапазоны, qualifiers, uncertainty и обязательную причину missing value;
- лабораторная валидация GEO-11 использует общий quantity registry, предлагает только совместимые единицы, поддерживает qualifiers и показывает значение в канонической единице;
- GEOX-E01-T06 заменяет lithology-only helpers обобщённым interval command engine с policies для coverage/overlap/gap/minimum thickness/snap, командами add/update/split/merge/stretch/shift/copy/remove, детальным diff и общей undo/redo history;
- GEO-09 мигрирован на interval engine: заполнение пропуска создаёт одну трассируемую add-команду, undo восстанавливает исходный gap, а merge разрешён только для эквивалентных литологии/стратиграфии/источника;
- GEOX-E01-T07 добавляет CRS-aware `Point/LineString/Polygon`: 2D/3D consistency, geographic ranges, line/ring invariants, polygon topology, bounds, metric length/area и position limits;
- геометрия сериализуется детерминированным envelope `kapgeo.geometry/v1`; преобразование между разными CRS требует явный `GeometryTransformAdapter` и до решения OQ-50 не имитируется;
- versioned-паспорт хранит устье как единый `SpatialPoint`, а demo repository и create-well compatibility boundary блокируют невалидные координаты до мутации;
- GEO-10 реализован во вкладке проб: создание из связанного литологического интервала, реестр, цепочка до лаборатории, явные типы и проверка duplicate/depth перед сохранением;
- GEO-11 добавляет к выбранной пробе результаты, единицы, метод, аналитика, QA/QC-статус и флаг контрольной пробы; несовместимая единица или невозможное значение блокируют сохранение;
- GEO-12 реализован во вкладке ГИС: реестр наборов, состав кривых, глубинная привязка, источник и явные QC-замечания;
- GEO-13 добавляет four-step demo-wizard LAS/DAT: файл, mapping depth/кривых, QC preview и явное подтверждение synthetic результата;
- GEO-14 открывает LogViewer из реестра: глубинная линейка, литология, GR/SP/RES, общий курсор, QC-marker и inspector значений/источника;
- GEO-15 добавляет в LogViewer ручную интерпретацию: границы, категория, confidence, обязательное обоснование и validation перед сохранением demo-черновика;
- GEO-16–18 завершают demo-сценарий AI-сравнения: экспертный выбор с обязательной причиной, отправка на проверку и видимый audit trail;
- GEO-19 добавляет выбор и сохранение шаблона геологической колонки без изменения исходных интервалов;
- `/geology/correlation` частично демонстрирует GEO-22/24: разрез A–A′, переключение датума, выбор опорной скважины, связи горизонтов, контрольные замечания и переход в литологическую колонку; реестра разрезов, редактирования трассы, рудных тел и полного предметного workflow пока нет;
- `/geology/reserves` частично демонстрирует GEO-27–30: параметры упрощённого подсчёта, мгновенно пересчитываемый тоннаж/металл, источники и передачу demo-версии на review; четыре методики руководства, версии входов, блоки/полигоны/ячейки и воспроизводимые расчётные запуски пока не реализованы;
- `/geology/delivery` является demo-срезом GEO-34: паспорт выдачи, выбор модулей-получателей, публикация версии и видимый audit trail;
- добавлен эталонный fully-populated synthetic-кейс `WELL-1010-FULL` (код `WELL-1010`): он покрывает все реализованные вкладки геологии без пустых рабочих областей;

## Работающие маршруты

- `/auth/sign-in`, `/auth/mfa` — demo-авторизация;
- `/home`, `/work`, `/notifications`, `/profile`, `/help` — общая платформа;
- `/geology`, `/geology/master`, `/geology/map`, `/geology/wells`, `/geology/wells/new`, `/objects/wells/$wellId` — геологический проводник, master data и объект;
- `/geology/correlation`, `/geology/reserves`, `/geology/delivery` — частичные demo-срезы GEO-22/24, GEO-27–30 и GEO-34;
- `/geology/interpretations/$interpretationId/compare` — рабочая область решения «ручное / AI / скорректированное»;
- `/technology`, `/modeling`, `/analytics`, `/admin` — стилизованные стартовые страницы модулей;
- `/forbidden` и not-found — системные состояния.

## Проверяемое поведение

- глобальная строка поиска в шапке открывает выборку synthetic-объектов (скважины, блок, отчёт, результат модели) и переходит к выбранной записи; проверено для `WELL-1042`;
- collapsed sidebar сохраняет доступную кнопку «Развернуть меню»; проверено browser-smoke;
- стрелка выбора даты в topbar центрирована относительно контента и не переносится на отдельную строку;

- общий монитор фоновых задач показывает queued/running/post-processing/succeeded/failed/cancelled, диагностические сообщения, результаты, cancel и retry; stage-only job не получает фиктивный процент;
- мастер импорта LAS/DAT создаёт идемпотентную `file_import` job с immutable input snapshot и версией parser, а новый набор ГИС появляется только как result успешной задачи;
- demo-вход через SSO и MFA, выход, смена персоны;
- фильтрация модулей и запрет прямого перехода без права;
- переходы между задачей, WELL-1042 и сравнением интерпретаций;
- синхронный фильтр карта/реестр/карточка, shareable URL, выбор маркера и инспектор;
- создание WELL-1064 в demo-сессии и переход в draft-карточку;
- переходы по URL-вкладкам паспорта и бурения без потери выбранного объекта;
- блокировка сохранения конструкции/рейса при невалидном интервале;
- browser-smoke GEO-09: заполнение разрыва `320–340 м` убирает предупреждение, diff показывает `1 добавлено`, undo восстанавливает разрыв и чистое состояние без ошибок консоли;
- browser-smoke GEO-11: для `U` доступны только совместимые `мг/кг`, `г/т`, `ppm`, `%`; смена единицы пересчитывает каноническое значение, qualifiers редактируются, ошибок консоли нет;
- browser-smoke GEOX-E01-T07: `EPSG:32642 · geometry v1` виден в versioned-паспорте; easting вне допустимого диапазона показывает блокирующую ошибку, смена CRS — предупреждение об отсутствии автоматического transform;
- изменение валидной точки устья создаёт паспорт v13, оставляет конструкцию v12 и помечает точные snapshots разреза/модели stale; ошибок консоли нет;
- создание версии 8 WELL-1042 после изменения глубины с обязательным обоснованием и impact preview;
- синхронный выбор рейса на глубинном треке, пересчёт выхода керна и добавление коробки;
- выбор результата сравнения, обязательная причина корректировки и подтверждение сохранения;
- responsive shell с мобильным меню;
- unit-тесты матрицы прав, фильтрации скважин и глубинных интервалов;
- `typecheck`, `test`, `lint` и production build выполняются без ошибок.
- `GEOX-E01-T09 Audit/evidence` (foundation): реализован append-only in-memory audit store с детерминированной сортировкой, событиями `science.job.*` для create/start/progress/retry/cancel/finished/failed, idempotent write, dedupe по idempotency/requestId и связкой job flow с requestId/result artifacts.
- Вкладка Audit в карточке скважины показывает объединённый timeline версий passport/construction и событий science job для выбранной скважины.
- Добавлен WellAuditWorkspace regression suite: src/pages/geology/components/WellAuditWorkspace.test.tsx (loading/пустая секция научных событий/science events + summary).


## Текущий приоритет (выполняется)
С 24 августа 2026 текущий implementation backlog — [13 prototype-эпиков с IndexedDB](./geology-functional-expansion/05-prototype-epics-backlog.md). Цель этапа: кликабельный демонстрационный сайт на GitHub Pages, deterministic synthetic data, persistence после reload и глобальный reset. Production backend и промышленная защита не входят в текущий DoD.

`GEOX-E01` закрыт: `DemoDatabase`/IndexedDB, deterministic seed/schema migration, repository adapters, persisted workflows/jobs/artifacts/audit, map workspace preferences и подтверждаемый reset в Profile реализованы. Подробная карта реализации и проверок: [GEOX-E01 verification](./geology-functional-expansion/09-e01-indexeddb-verification.md).

Ранее завершённые foundation-срезы сохраняются как база миграции:

- `GEOX-E01-T09 Audit/evidence` и `GEOX-E01-T08 Scientific jobs`:
 - T09: domain types + contracts, in-memory append-only audit store, emitters `science.job.*` (create/start/progress/retry/cancel/finish/failed), dedupe по `requestId/idempotencyKey` и детерминированные тесты.
 - T08: общий contract/lifecycle, deterministic demo + HTTP repository, query/mutation, карточка и глобальный монитор, error/diagnostic/cancel/retry, интеграция home и LAS/DAT import.

Текущий прогресс E10: реализованы обзор, пакет оперативных замеров, лабораторный реестр растворов, материальный баланс с решением, оборудование, РВР, технологические ГИС `/technology/logs`, plan-fact/отчётность и AI-рекомендации с человеческим решением `/technology/recommendations`.

Текущий прогресс E11: реализованы `/modeling`, workspace, preflight, demo-run, результаты и сравнение сценариев. Входы GEO/TECH фиксируются в UI как snapshot; интерактивный расчёт и публикация — demo-механика.

Текущий прогресс E12: реализованы `/analytics` с as-of картой, связанным inspector/selection и provenance KPI, а также `/analytics/decision` с evidence, рекомендацией, решением и передачей demo-задачи в технологию.

Текущий прогресс E13: `/admin` покрывает пользователей, effective permissions и одобрение заявки; `/admin/operations` — версионные нормативы с impact preview, диагностику/retry интеграции и жизненный цикл AI-модели.

## Пока не реализовано

- production backend и настоящие интеграции;
- полный каталог P0/P1 routes и предметных рабочих областей;
- полный профессиональный набор предметных редакторов, четыре методики запасов и научно-вычислительный контур 2D/3D;
- промышленная авторизация/ЭЦП;
- полная RU/KZ/EN локализация;
- Storybook, MSW handlers, расширенное component/e2e coverage и production deployment;
- backend persistence: текущие изменения живут только в demo-состоянии браузера.

## Последняя browser-проверка

20 августа 2026 проверен сценарий R1 → WELL-1042 → Паспорт: изменение X показывает два точных downstream impact до сохранения; без предметной причины команда недоступна; после сохранения заголовок обновляется с версии 7 до 8 и показывает новую координату, паспорт сообщает request ID, а разрез и модель отображаются как stale без изменения прежних version IDs. Ошибок console/runtime не обнаружено.

## Правило обновления

После каждого значимого этапа обновлять этот файл: работающие routes, реальные действия, тесты, ограничения и следующий вертикальный срез.

## Последнее изменение интерфейса

- Статусные метки приведены к единому неинтерактивному виду: компактный фон, цветная точка и текст без кнопочной обводки. Нейтральные коды и счётчики остаются тегами, а семантические состояния автоматически получают статусный маркер.
- Реализован изолированный справочный центр `/help/*`: быстрый старт, поиск, руководства R1–R14, каталог страниц, межролевые процессы и реестр браузерных проверок. Контент и стили находятся в `src/help-center/`; инструкция удаления — в `src/help-center/README.md`.
- Перед написанием руководства 12 августа 2026 проверены вход/MFA, фактическое меню всех 14 ролей, 40 маршрутов и ключевые изменения состояния в GEO, TECH, MOD, ANALYTICS и ADM.
- Страницы `/help/*` проверены на desktop и mobile 390 px: внутренние ссылки, поиск по `TASK-118`, ролевые и модульные deep link, отсутствие горизонтального переполнения.
- Завершён визуальный QA-срез E18: проверены все 52 прикладных URL-варианта и 4 системных маршрута на desktop, 1024 px и mobile 390 px. Исправлены сетка `/admin/operations`, переполнение meta-badge в заголовках, мобильные этапы РВР/моделирования, технологические ГИС, карточки доменных статусов WELL-1010, подписи глубин и страница настроек доступности.
- Минимальный размер содержательного текста подтверждён на уровне 12 px; горизонтальное переполнение документа и выход видимого контента за viewport после исправлений не обнаружены. Допустимая горизонтальная прокрутка сохранена только внутри таблиц, вкладок и профессиональных рабочих полотен.
- Удалены оставшиеся пользовательские упоминания режима демонстрации из заголовка браузера и панели контроля корреляции.
- Боковая навигация уплотнена до 13 px; в desktop-состоянии свёрнутого меню логотип полностью скрывается, а кнопка раскрытия центрируется. Мобильное выезжающее меню сохраняет полный бренд.
- Счётчик непрочитанных уведомлений в верхней панели увеличен до 18 px, цифра центрирована и отделена от иконки контрастной обводкой.
- Действия в `/notifications` больше не маскируются под статусные badge: «Открыть», «Протокол» и «Продлить» оформлены как ссылки-кнопки и ведут соответственно к сравнению интерпретаций, журналу ГИС и профилю.
- Проект подготовлен к публикации на GitHub Pages в `ArmorDRX97/kapgeo_prototype`: production-сборка использует `/kapgeo_prototype/` и hash history для устойчивых deep link, deployment выполняется workflow `.github/workflows/deploy-pages.yml`, каталог `archive/` полностью исключён из Git.
- Публичная версия опубликована по адресу `https://armordrx97.github.io/kapgeo_prototype/`. На опубликованной сборке проверены загрузка ресурсов, вход, MFA, переход на `#/home`, базовый шрифт 14 px и отсутствие горизонтального переполнения.
- Внутренние ссылки справочного центра переведены на router-aware компонент: навигация, поиск, роли, модули, хлебные крошки и переходы к рабочим экранам сохраняют repository base path и hash history GitHub Pages вместо выхода на корень `armordrx97.github.io`.

GEOX-E12 завершён: `/geology/delivery` замыкает exact-version publication flow с demo approval/reauth, Technology/Modeling/Analytics handoff, withdrawal/replacement, export history, RU/KZ/EN fallback, accessibility/performance/policy/browser QA и regression evidence. Все состояния synthetic, сохраняются в IndexedDB и сбрасываются global reset. Проверка: [20-e12 publication/hardening](./geology-functional-expansion/20-e12-publication-hardening-verification.md).


GEOX-E00 завершён: добавлен `/geology/methodology` — интерактивный методический центр передачи прототипа с решениями по пяти контурам, четырьмя synthetic method definitions, versioned conditions/dictionaries, templates и volume profiles. `Verified` в этом экране является demo workflow state, а не нормативным подтверждением. Проверка: [21-e00 methodology](./geology-functional-expansion/21-e00-methodology-verification.md). Все 13 prototype-эпиков GEOX-E00…E12 теперь имеют реализованный IndexedDB-срез и evidence-документ.



- 24 августа 2026 локальная Vite-конфигурация разделена по режимам: dev-сервер
  работает с корневым URL (`/home`), а production build сохраняет prefix
  `/kapgeo_prototype/` для GitHub Pages. Проверены `typecheck`, 40 test files /
  98 tests и production build. На момент записи этот визуальный QA ещё не был начат; матрица обхода находится в
  [visual-qa-route-matrix.md](./visual-qa-route-matrix.md).

- 24 августа 2026 завершён последовательный browser-QA canonical routes в
  изолированном Chrome: desktop `1440 px`, mobile `390 px`, дополнительно
  topbar `/home` на `960 px`. Исправлены overlap context/date в topbar,
  обрезание status Badge в `/geology/methodology` и mobile overflow
  approval-actions в `/geology/delivery`. Детали, охват и повторные результаты:
  [visual-qa-route-matrix.md](./visual-qa-route-matrix.md). Финально:
  `typecheck`, 40 files / 98 tests, `build`; lint без errors (3 прежних
  warnings exhaustive-deps).


- 25 августа 2026 выполнен визуальный QA маршрута `/objects/wells/WELL-1042?tab=drilling` в Chrome (1440 px) под ролью Геолог. Исправлены слитые значения в таблице trajectory (добавлена grid-разметка строк и безопасное сокращение источника) и удалён отображавшийся внизу страницы буквальный артефакт `\n`. Повторная браузерная проверка подтвердила пять раздельных колонок и отсутствие артефакта; `typecheck`, 40 test files / 98 tests и `build` проходят.
- 25 августа 2026 продолжен визуальный QA карточки WELL-1042: проверены вкладки Обзор, Паспорт, Литология, ГИС, Пробы, Технология, Оборудование, Модель, Документы и Аудит в Chrome на desktop 1440 px и mobile 390 px. Исправлены grid-строки интерпретационных таблиц и переполнение правой колонки на ГИС; адаптивно перенесены action-блоки заголовков панелей, кнопка «Добавить секцию» в Паспорте и «Сохранить вид» в шаблоне Литологии. Все проверенные вкладки теперь не имеют горизонтального переполнения страницы; аудит после ожидания данных отображается корректно. Проверка: `typecheck`, 40 test files / 98 tests, `build`.
- 25 августа 2026 закрыты замечания по приложенным скриншотам карточки WELL-1042. В GEOX-E04 строки versioned tracks получают общую grid-разметку и больше не сливаются; действия гранулометрии выровнены в единый вертикальный action-блок. В GEOX-E05 шаблон треков переведён в одну колонку без посимвольного переноса кодов; в GEOX-E06 правые таблицы интерпретации заменены компактными карточками «интервал / источник / метод / статус». Выравнивание шаблона геологической колонки переработано на desktop-grid с корректным mobile fallback. Повторный Chrome QA на desktop 1440 px: overflow 0 для Литологии, Проб и ГИС; `typecheck`, 40 test files / 98 tests и `build` проходят.

- 25 августа 2026 реализована permission-based интерактивная экскурсия по всему геологическому модулю: fixed launcher и соседнее меню, полный каталог из 74 шагов и пять тематических сценариев, автоматический обзор текущей/будущей страницы, route/tab navigation, target wait/fallback, overlay/highlight, keyboard focus, pause/resume/completion и локальный reset. Persona-specific progress хранится в IndexedDB `preferences` и очищается глобальным reset. Полный Chrome-проход подтвердил 74/74 target без fallback на 21 route/URL-варианте; desktop 1440 и mobile 390 имеют overflow 0. Проверка: `typecheck`, 43 test files / 106 tests, `lint`, production `build`. Evidence: [22-geology-guided-tour-verification.md](./geology-functional-expansion/22-geology-guided-tour-verification.md).
- 26 августа 2026 БГД актуализирована по `UC.KAPGEO.BGD.01`: `/geology/bgd` и `/geology/bgd/:depositId` используют один неизменяемый числовой `code` без второго строкового кода; обязательные названия и названия залежей ведутся в RU/KZ/EN, описания — в RU/KZ/EN, система координат необязательна, пользовательский тип расширяет справочник. Добавлены совместимая миграция старых IndexedDB-записей, поиск по коду и всем языкам, сортировка колонок, пагинация, сброс и полный URL-контекст, отдельные списки участков/залежей, сохраняемый выбор текущего месторождения в верхнем контексте, разрешения `geology.bgd.*`, объектный read-only, create/update/delete/view audit, empty/not-found/version-conflict/error states и dependency guard встроенных залежей. Служебные формулировки о постановке и хранилище из БГД убраны. Browser QA на 1280 px и 390 px подтвердил отсутствие page overflow, видимость всех колонок desktop, RU/KZ/EN-формы, поиск по `Severnoye`, URL-параметры и обновление верхнего контекста; финально проходят `typecheck`, 44 files / 111 tests, `lint` без errors (3 прежних warnings вне БГД) и production `build`. Evidence: [23-geobase-field-crud-verification.md](./geology-functional-expansion/23-geobase-field-crud-verification.md).
- 26 августа 2026 добавлен сохраняемый переключатель меню `Минимум` для изолированной передачи БГД. После включения shell и повторный вход оставляют только БГД, профиль и персону Геолог; контекст и дата полностью скрыты, поиск, остальные команды верхней панели, выход, справка и экскурсия не открывают другие области, а route guard возвращает прямые URL вне БГД в `/geology/bgd`. Выключение с перезагрузкой полностью восстанавливает обычную навигацию и роли. Профиль в минимальном состоянии сокращён до идентичности геолога без общесистемных и демонстрационных настроек. Browser QA на 1280 px и 390 px подтвердил переключение в обе стороны, сохранение после reload, redirect из `/technology`, отдельный экран входа и отсутствие горизонтального переполнения. Финально проходят `typecheck`, 45 files / 112 tests, `lint` без errors (3 прежних warnings вне среза) и production `build`. Детали добавлены в [23-geobase-field-crud-verification.md](./geology-functional-expansion/23-geobase-field-crud-verification.md).
- 27 августа 2026 реализован `UC.KAPGEO.BGD.03 Создание/редактирование скважины`: карточка месторождения получила прокручиваемый список скважин и переходы `/geology/bgd/:depositId/wells/new` и `/geology/bgd/:depositId/wells/:wellId`. Четыре вкладки охватывают общие сведения, RU/KZ/EN-описания, геометрию устья/забоя и расчёт координат, паспорт, проходку и интервалы бурения, освоение с мультиязычными работами, геологические условия и непроницаемые интервалы. Сохранение создаёт IndexedDB record/version/audit, смена состояния фиксирует историю, update защищён `expectedVersion`; разрешения разделяют полный доступ R1/R13, технологические поля R6, глубину по каротажу R2 и read-only. Browser QA подтвердил создание `1064`, отдельную карточку, reload persistence, все вкладки и работу в `Минимум`; исправлено пересечение sticky-save с экскурсией. Финально проходят `typecheck`, 46 files / 114 tests, `lint` без errors (3 прежних warnings вне среза) и production `build` (остаётся общий chunk-size warning). Evidence: [24-geobase-well-creation-verification.md](./geology-functional-expansion/24-geobase-well-creation-verification.md).
- 27 августа 2026 детерминированная скважина `WELL-1010-FULL` дополнена как полностью заполненный эталон БГД: принадлежность к участку и залежи, состояние, RU/KZ/EN-описания, вся геометрия, паспорт, сведения о бурении и три интервала проходки, дебиты и три мультиязычные работы освоения, геологические условия и три непроницаемых интервала. Связанные разделы единой карточки уже содержат секции конструкции, проходки, ящики керна, пробы, лабораторные результаты, ГИС и литологию. Запись восстанавливается общим reset; ранее созданная IndexedDB автоматически и совместимо получает недостающие БГД-данные при чтении. Browser QA подтвердил заполненность всех четырёх вкладок прямого маршрута `/geology/bgd/DEP-SARYTAU/wells/WELL-1010-FULL`. Финально проходят `typecheck`, 47 files / 116 tests, `lint` без errors (3 прежних warnings вне среза) и production `build` (остаётся общий chunk-size warning). Evidence: [24-geobase-well-creation-verification.md](./geology-functional-expansion/24-geobase-well-creation-verification.md).
- 27 августа 2026 перед разделом «Паспорт» карточки скважины БГД добавлен раздел «Документация» с датами начала и окончания составления документации (`well_passport.document_start_date`, `well_passport.document_end_date`). Поля сохраняются в IndexedDB, ограничивают друг друга через `min/max`, а доменная проверка отклоняет начало позже окончания. Старые записи открываются с безопасными пустыми значениями; `WELL-1010-FULL` автоматически дополняется заполненными датами без общего reset. Browser QA подтвердил порядок «Геометрия → Документация → Паспорт» и значения эталонной записи. Финально проходят `typecheck`, 47 files / 117 tests, `lint` без errors (3 прежних warnings вне среза) и production `build` (остаётся общий chunk-size warning). Evidence: [24-geobase-well-creation-verification.md](./geology-functional-expansion/24-geobase-well-creation-verification.md).
