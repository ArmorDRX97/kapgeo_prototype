# Дорожная карта, эпики, задачи и подзадачи

## 1. Стратегия поставки

Работа идёт вертикальными срезами: каждый этап заканчивается кликабельным сценарием, а не набором незавершённых компонентов. Календарные сроки назначаются после определения состава команды и подтверждения P0/P1; ниже зафиксированы последовательность и зависимости.

| Этап | Результат | Основные эпики |
|---|---|---|
| 0. Согласование | подтверждён scope и UX-концепция | E00–E01 |
| 1. Foundation | приложение, дизайн-система, mocks, QA | E02–E05 |
| 2. Общая платформа | shell, auth, объекты, workflows | E06–E08 |
| 3. Геология | первый предметный vertical slice | E09 |
| 4. Технология | оперативный и РВР-срез | E10 |
| 5. Моделирование | проект–расчёт–публикация | E11 |
| 6. Аналитика | карта–причина–решение | E12 |
| 7. Администрирование | доступ, справочники, интеграции, AI | E13 |
| 8. Полировка | локализация, a11y, responsive, performance | E14–E15 |
| 9. Передача | demo, спецификации, handoff | E16 |

## 2. Приоритеты

- **P0:** нужен для связного прототипа и главных бизнес-рисков.
- **P1:** нужен для полного UX-покрытия модулей.
- **P2:** расширение после подтверждения 2D/3D, отчётных форм и production-ограничений.

### 2.1. Текущий задачник реализации

Статусы обновляются только после проверки работающего сценария. `Частично` означает, что UX-контур существует, но перечисленные ниже функции ещё не закрыты.

| Задача | Статус | Реализованный результат | Осталось |
|---|---|---|---|
| E02-T01 React/TypeScript/Vite | Готово | strict TS, lint/test/build, aliases | CI environment matrix |
| E02-T02 Router | Частично | route tree, guards, typed search GEO | lazy modules, root error boundary |
| E03-T01 Tokens/themes | Частично | semantic light tokens, reduced motion | dark/high-contrast, density |
| E03-T02–04 UI/layout/data display | Частично | controls, shell, panels, badges, registry, states | Storybook и полный state coverage |
| E03-T05 Map workbench | Частично | слои, legend, cross-selection, inspector | spatial tools, measure, clustering |
| E04-T01 Domain schemas | Частично | session/well schemas и IDs | остальные домены + Zod contracts |
| E04-T03 Synthetic data | Частично | 14 персон, wells, tasks, jobs | полный связный dataset модулей |
| E05-T01 Unit tests | Частично | permissions, well filters и depth intervals | статусы, units, generator |
| E06-T01 Auth/MFA | Частично | SSO demo, MFA, persistent session | errors, lockout, return URL, reauth |
| E06-T03 App shell | Частично | role navigation, context, notifications | command search и рабочий as-of |
| E06-T05 Demo persona/banner | Готово | 14 персон, switcher, synthetic banner | — |
| E07-T01 Object explorer | Частично | list/map, URL filters, saved presets | tree, bulk selection, saved persistence |
| E07-T02 Well card | Частично | header, URL-tabs, completeness, cross-links, version impact | documents/audit/full diff |
| E09-T01 Overview/map/well registry | Готово | GEO-01, GEO-03, GEO-04; общий фильтр карта↔реестр | production spatial engine |
| E09-T02 Passport/construction/drilling/core | Готово | GEO-05–08: wizard, passport, construction, drilling/core, version impact | production persistence и реальные справочники |
| E09-T03 Lithology/stratigraphy interval editor | Готово | GEO-09: колонка, выбор, границы, split/merge, заполнение пропуска, copy, undo/redo, diff и save draft | concurrent version conflict и versioned dictionaries в production |
| E09-T04 Sampling, lab results and QA/QC | Готово | GEO-10/11: связанные с интервалами пробы, статусы цепочки, типы, duplicate/depth validation, результаты, единицы и QA/QC | пакетное создание, штрихкоды, LIMS и расширенные QC-правила |
| E09-T05 Log registry, demo import and viewer | Готово | GEO-12–14: registry, QC, four-step LAS/DAT demo wizard, synchronized tracks and cursor inspector | real parsing, persisted layouts, comments and templates |
| E09-T06 Manual/AI/compare/resolution | Частично | GEO-17/18, решение и обязательная причина | manual/AI editors, approval/audit |
| E09-T07 Геологическая колонка и template | Готово | GEO-19: шаблон представления колонки, сохранение в demo-сессии | persisted templates и роли доступа |
| E09-T08 Карта, разрез и корреляция | Готово | `/geology/correlation`: профиль A–A′, datum, cross-selection и контроль корреляции | редактор трассы, сохранение/approval разреза |
| E09-T09 Запасы | Готово | `/geology/reserves`: параметры, расчёт тоннажа/металла, зависимости и review | contours, passport и production calculation engine |
| E09-T10 Отчёты и cross-module handoff | Готово | `/geology/delivery`: паспорт, выбор получателей, публикация и audit trail | production integration contracts и генерация реального PDF |

Следующая активная задача: **сквозная UX-проверка GEO**.

## 3. E00 — подтверждение продукта и источников

**Цель:** закрыть расхождения до дорогостоящей детализации.

- E00-T01 Провести обзор комплекта.
  - показать карту модулей, ролей и экранов;
  - подтвердить приоритет источников;
  - назначить владельцев доменов и согласующих.
- E00-T02 Провести предметные интервью.
  - R1/R2/R3: скважина, ГИС, запасы;
  - R6/R7/R8/R9/R10: смена, лаборатория, оборудование, РВР;
  - R4/R5: моделирование;
  - R11/R12: аналитика и решения;
  - R13/R14: доступ, интеграции и AI.
- E00-T03 Закрыть критические OPEN.
  - контролёр как роль или permission;
  - границы 2D/3D;
  - brandbook и языковые требования;
  - перечень утверждённых отчётных форм;
  - workflow и ЭЦП;
  - объёмы данных и целевые устройства.

**Выход:** согласованный P0/P1, владельцы терминов и протокол решений.

## 4. E01 — UX-концепция и исследование

- E01-T01 Аудит legacy-интерфейсов.
  - составить карту привычных действий;
  - отметить критические shortcut/массовые операции;
  - не переносить desktop layout автоматически.
- E01-T02 Информационная архитектура.
  - проверить дерево объектов;
  - card sorting для навигации ролей;
  - протестировать единые карточки скважины и блока.
- E01-T03 Low-fi прототипы P0.
  - auth/home/object card;
  - ГИС compare;
  - технологический баланс/РВР;
  - modeling run;
  - аналитическая карта.
- E01-T04 Usability review с 5–8 представителями ключевых ролей.
  - сценарии без подсказок ведущего;
  - фиксация времени, ошибок и терминологических проблем;
  - приоритизация изменений.

## 5. E02 — frontend foundation

- E02-T01 Инициализировать React/TypeScript/Vite.
  - strict TypeScript;
  - aliases и module boundaries;
  - environments `demo/test`;
  - lint/format/test/build scripts.
- E02-T02 Настроить router.
  - route tree;
  - typed search params;
  - lazy modules;
  - not-found/forbidden/error boundaries.
- E02-T03 Настроить data layer.
  - API client и envelope/problem;
  - Query provider и keys;
  - Zod parsing;
  - retry/cancel policies.
- E02-T04 Настроить CI quality gates.
  - typecheck/lint/unit/build;
  - Storybook build;
  - Playwright smoke;
  - artifacts и bundle report.

## 6. E03 — дизайн-система

- E03-T01 Реализовать tokens и themes.
  - color/spacing/type/radius/elevation;
  - light/dark/high-contrast;
  - density modes;
  - reduced motion.
- E03-T02 Базовые controls.
  - buttons/links/menus;
  - inputs/select/date/unit/interval;
  - validation and form summary;
  - focus/disabled/loading.
- E03-T03 Layout и navigation.
  - app shell/context bar;
  - tabs/stepper/drawer/inspector;
  - responsive panels;
  - command palette.
- E03-T04 Data display.
  - DataGrid;
  - status/quality/version/source badges;
  - timeline/audit/diff;
  - loading/empty/error states.
- E03-T05 Предметные primitives.
  - map workbench shell;
  - chart wrapper;
  - depth/log tracks;
  - background job monitor.
- E03-T06 Storybook.
  - stories всех состояний;
  - RU/KZ/EN и long text;
  - a11y smoke;
  - visual regression baseline.

## 7. E04 — synthetic data и mock API

- E04-T01 Описать domain schemas и IDs.
- E04-T02 Реализовать seed PRNG и справочники.
- E04-T03 Сгенерировать оргструктуру, wells, geology, technology, models.
- E04-T04 Реализовать MSW handlers.
  - list/filter/sort/page;
  - CRUD/version/workflow;
  - jobs/import/export;
  - auth/permissions/errors.
- E04-T05 Реализовать scenario patches SCN-01–15.
- E04-T06 Добавить invariant tests и summary snapshot.
- E04-T07 Добавить reset, persona и demo-clock.

## 8. E05 — тестовая инфраструктура

- E05-T01 Unit tests для прав, статусов, intervals, units и генератора.
- E05-T02 Component harness с MSW.
- E05-T03 Playwright fixtures по persona/scenario.
- E05-T04 Accessibility pipeline и ручной keyboard checklist.
- E05-T05 Screenshot baselines для 1440/1024 и light/dark canvas.
- E05-T06 Test IDs только для семантически недоступных случаев; основные locators — role/label/text.

## 9. E06 — auth, shell и профиль

- E06-T01 SSO/fallback login и MFA.
  - loading/error/locked;
  - return URL;
  - 6-failure demo;
  - session countdown и reauth.
- E06-T02 Request-access workflow.
  - форма scope/role/reason;
  - статус запроса;
  - admin approval;
  - уведомление.
- E06-T03 App shell.
  - role navigation;
  - context/as-of;
  - search/commands;
  - jobs/notifications.
- E06-T04 Profile/preferences/security.
- E06-T05 DEMO persona switcher и persistent demo banner.

## 10. E07 — объектная платформа

- E07-T01 Проводник объектов list/tree/map.
- E07-T02 Единая карточка скважины.
  - header/completeness;
  - tabs registry;
  - cross-links;
  - documents/audit.
- E07-T03 Карточка блока и участка.
- E07-T04 Version history и diff.
  - scalar fields;
  - tables/intervals;
  - geometry preview;
  - stale dependencies.
- E07-T05 Comments/mentions/attachments.

## 11. E08 — общие workflows и данные

- E08-T01 Личная очередь задач и карточка задания.
- E08-T02 Review/approval/request-changes.
- E08-T03 Import wizard.
  - source;
  - mapping;
  - validation grid;
  - job/result/retry.
- E08-T04 Export wizard и история.
- E08-T05 Каталог/параметры/preview отчётов.
- E08-T06 Центр качества данных.
- E08-T07 Background jobs, notifications и audit hooks.

## 12. E09 — геологический модуль

- E09-T01 Обзор, карта и реестр скважин.
- E09-T02 Паспорт/конструкция/бурение/керн.
- E09-T03 Interval editor литологии и стратиграфии.
  - depth selection;
  - split/merge;
  - overlap validation;
  - version conflict.
- E09-T04 Пробы и лабораторные результаты.
- E09-T05 ГИС import/QC/viewer.
- E09-T06 Manual/AI/compare/resolution.
  - synchronized tracks;
  - confidence/evidence;
  - threshold conflicts;
  - expert reason;
  - approve and audit.
- E09-T07 Геологическая колонка и template.
- E09-T08 Карта/разрез/correlation.
- E09-T09 Запасы.
  - project setup;
  - plan/contours;
  - result table;
  - block passport;
  - diff/approval/publish.
- E09-T10 Отчёты и cross-module handoff.

**Demo gate:** R2 проходит F04, R3 — F05, опубликованный объект виден в связанной аналитике.

## 13. E10 — технологический модуль

- E10-T01 Обзор/объекты/технологическая схема.
- E10-T02 Оперативные замеры.
  - shift list;
  - batch input/paste/import;
  - validation and source priority;
  - closure/reopen reason.
- E10-T03 Растворы и лаборатория.
- E10-T04 Потоки, материальный баланс и кислота.
  - formula/source view;
  - drill-down;
  - thresholds;
  - deviations.
- E10-T05 Equipment registry/card/timeline.
- E10-T06 РВР plan/job/tablet execution/result.
- E10-T07 Технологические ГИС.
- E10-T08 Суточная и периодическая отчётность.
- E10-T09 Plan-fact и AI recommendations.

**Demo gate:** R7/R8/R6 проходят F06, R10 — F08, отчёт воспроизводим на выбранную дату.

## 14. E11 — моделирование

- E11-T01 Projects/new-from-published snapshot.
- E11-T02 Workspace tree/inspector/canvas.
- E11-T03 Domain/grid/cells.
- E11-T04 Arrays/fields/import/interpolation.
- E11-T05 Wells/regimes and physical-chemical parameters.
- E11-T06 Initial/boundary conditions.
- E11-T07 Scenarios clone/diff.
- E11-T08 Preflight checks.
- E11-T09 Async run monitor/log/fail/retry/cancel.
- E11-T10 Result maps/profiles/time series.
- E11-T11 Fact validation/scenario compare.
- E11-T12 Publish/revoke/export.

**Demo gate:** один успешный и один аварийный запуск, сравнение сценариев и публикация в ЭАМ.

## 15. E12 — аналитика

- E12-T01 Role dashboard и KPI provenance.
- E12-T02 Interactive as-of map/layers/legend.
- E12-T03 Object inspector и linked selections.
- E12-T04 Selection builder/table/statistics.
- E12-T05 Charts/correlations.
- E12-T06 Fact/model/forecast comparison.
- E12-T07 Deviations and evidence.
- E12-T08 Recommendation/decision/task handoff.
- E12-T09 Analytics passport, saved view и report.

**Demo gate:** R11 находит проблему без заранее известного ID, R12 принимает решение, профильная задача появляется в ТЕХ.

## 16. E13 — администрирование

- E13-T01 Users/roles/scopes/access requests.
- E13-T02 Permission matrix и preview «как пользователь».
- E13-T03 Org structure.
- E13-T04 Versioned dictionaries/norms/impact.
- E13-T05 Templates.
- E13-T06 Integrations/queue/error/retry.
- E13-T07 Schedules/jobs.
- E13-T08 Audit/search/export.
- E13-T09 Monitoring/backups UI.
- E13-T10 AI models/datasets/metrics/publish/rollback.
- E13-T11 Environment/localization/feature flags.

## 17. E14 — локализация, responsive и доступность

- E14-T01 Вынести все строки в i18n catalog.
- E14-T02 Проверить глоссарий RU/KZ/EN с владельцами.
- E14-T03 Pseudo-localization и переполнение.
- E14-T04 Keyboard walkthrough P0 flows.
- E14-T05 Screen reader smoke и chart alternatives.
- E14-T06 Contrast/high-contrast/reduced-motion.
- E14-T07 1440/1280/1024/tablet/mobile read-only.
- E14-T08 Field mode для RVR.

## 18. E15 — performance и UX-polish

- E15-T01 Bundle split and analyze.
- E15-T02 Virtualize grids/trees/long logs.
- E15-T03 Downsample charts and cluster map layers.
- E15-T04 Preserve selection/scroll/drafts.
- E15-T05 Network latency/error walkthrough.
- E15-T06 Empty/error/partial/forbidden coverage audit.
- E15-T07 Content design and terminology pass.
- E15-T08 Remove dead routes, placeholder controls and console errors.

## 19. E16 — приёмка и handoff

- E16-T01 Прогнать acceptance checklist.
- E16-T02 Подготовить 30/60/90-minute demo scripts.
- E16-T03 Зафиксировать версии demo seed и routes.
- E16-T04 Обновить screen catalog и traceability.
- E16-T05 Экспортировать Storybook/components/tokens документацию.
- E16-T06 Подготовить API contracts и integration assumptions.
- E16-T07 Провести walkthrough для design/frontend/backend/QA.
- E16-T08 Составить список production gaps и следующие релизы.

## 19.1. E17 — встроенная пользовательская документация

- [x] E17-T01 Проверить вход, MFA, меню и стартовые страницы R1–R14.
- [x] E17-T02 Проверить данные на всех реализованных маршрутах и ключевые действия модулей.
- [x] E17-T03 Спроектировать удаляемый модуль справочного центра.
- [x] E17-T04 Реализовать быстрый старт и поиск по руководству.
- [x] E17-T05 Описать обязанности и последовательности действий всех 14 ролей.
- [x] E17-T06 Описать назначение всех реализованных страниц и вкладок.
- [x] E17-T07 Описать межролевые handoff-процессы и добавить прямые ссылки.
- [x] E17-T08 Добавить реестр проверенных сценариев и тест полноты контента.
- [x] E17-T09 Провести финальную browser-проверку `/help/*` на desktop и mobile.
- [ ] E17-T10 Провести stakeholder walkthrough и собрать предметные уточнения.

## 19.2. E18 — полный визуальный QA и адаптивная полировка

- [x] E18-T01 Сверить фактический реестр маршрутов с аудитируемым набором страниц, включая auth, forbidden и not-found.
- [x] E18-T02 Автоматически проверить 52 прикладных URL-варианта на desktop, 1024 px и mobile 390 px: document overflow, выход элементов за viewport, обрезанный текст и размер текста ниже 12 px.
- [x] E18-T03 Исправить сетку `/admin/operations` и исключить конфликт общего селектора строки со статусными badge.
- [x] E18-T04 Устранить мобильное переполнение PageHeader, длинных meta-badge, этапов РВР и запуска модели.
- [x] E18-T05 Адаптировать полотно технологических ГИС и карточки состояния данных скважины к ширине 390 px.
- [x] E18-T06 Исправить подписи глубин в сравнении интерпретаций и привести их к минимальным 12 px.
- [x] E18-T07 Оформить недостающие состояния страницы доступности: сетку, controls, локализацию и чек-лист.
- [x] E18-T08 Вручную проверить ключевые сложные экраны GEO, TECH, MOD, ANALYTICS, ADM и HELP после системных исправлений.
- [x] E18-T09 Повторить полный мобильный прогон и подтвердить отсутствие горизонтального переполнения документа.
- [x] E18-T10 Обновить implementation status и выполнить typecheck, tests, lint и production build.
- [x] E18-T11 Уменьшить типографику боковой навигации и убрать логотип из desktop-состояния свёрнутого меню, сохранив отдельную кнопку раскрытия.
- [x] E18-T12 Исправить размер, центрирование и контраст счётчика непрочитанных уведомлений в верхней панели.
- [x] E18-T13 Заменить ошибочно использованные статусные badge в списке уведомлений на явные рабочие ссылки и проверить их назначения.
- [x] E18-T14 Подготовить GitHub Pages: production hash history, repository base path, Actions workflow и полное исключение `archive/`.

## 20. Зависимости

```text
E00 → E01 → E02
            ├── E03 ─┐
            ├── E04 ─┼→ E06 → E07 → E08
            └── E05 ─┘                 ├→ E09
                                      ├→ E10
                                      ├→ E11
                                      ├→ E12
                                      └→ E13
E09 + E10 + E11 + E12 + E13 → E14 → E15 → E16
```

E09–E13 можно вести параллельно только после стабилизации design-system, entities, auth, versioning и mock contracts.

## 21. Definition of Ready для задачи

- указан экран и сценарий;
- определены роли/permissions/scope;
- есть данные и error states;
- понятны статусы и transitions;
- согласована терминология;
- указан responsive минимум;
- подготовлен fixture/scenario;
- открытые предметные вопросы не меняют суть задачи.

## 22. Definition of Done для экрана

- маршрут и deep link работают;
- happy/loading/empty/error/forbidden/partial состояния реализованы;
- действия соответствуют роли и статусу;
- форма валидирует и сохраняет demo-state;
- есть keyboard focus и доступные labels;
- RU/KZ/EN не ломают layout;
- 1440 и 1024 проверены, tablet/mobile — по матрице;
- Storybook/component tests добавлены;
- P0 flow проходит Playwright;
- нет console errors и незадействованных controls;
- screen catalog и сценарий обновлены.

## 23. Управление изменениями

Новая страница не добавляется только потому, что в источнике существует отдельная таблица или desktop-форма. Запрос проходит проверку:

1. какая роль и задача;
2. нельзя ли встроить в существующую карточку/workspace;
3. какие данные и статус меняются;
4. какие модули зависят;
5. какие сценарии/тесты затрагиваются;
6. относится ли к P0/P1/P2;
7. кто согласует термин и бизнес-правило.
