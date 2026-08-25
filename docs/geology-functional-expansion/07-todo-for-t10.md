# GEOX-E01-T10 (Shared workspace) — рабочий план и текущее внедрение

## Цель этапа
Сделать геологический workspace (`/geology/map` + `/geology/wells` + `/objects/wells/$wellId`) одним общим состоянием выбора/фокуса, чтобы выбор скважины, фильтры и контекст отображались единообразно и были видимы по URL.


## GEOX-E01-T09 Audit/evidence — вкладка «Аудит» скважины

- Реализован новый компонент `WellAuditWorkspace` в `src/pages/geology/components/WellAuditWorkspace.tsx` на базе `fetchWellPassportHistory` + `useScientificJobs().auditLog`.
  - отображение истории версий паспорта и конструкции из demo-репозитория по `well.id` (последние версии, статусы, автор, причина);
  - отрисовка событий `science.job.*` в отдельной секции timeline;
  - корректная обработка loading/empty-состояний для журнала;
  - добавлены минимальные стили в `src/app/styles/global.css`;
  - вкладка `audit` в `WellDetailsPage.tsx` подключена к реальному компоненту вместо placeholder.

**Статус: DONE (phase 1 UI + data link + regression tests)**: базовая трасса событий по скважине доступна на карточке, и покрыта regression-тестами `src/pages/geology/components/WellAuditWorkspace.test.tsx` (`loading`, `версии + empty`, `science events`).
## Что реализовано в этой задаче

- В `src/pages/geology/wellSearch.ts` добавлен расширенный контракт search-параметров:
  - `selectedWellId`
  - `workspaceVersion`
  - `workspaceScenario`
  - `workspaceFocus`
- Валидатор и конвертеры обновлены:
  - `validateWellSearch`
  - `searchToWellFilters`
  - `filtersToWellSearch`
  - `searchToWellWorkspace`
- В `/geology/map`:
  - карта и список делят выбор скважины через `selectedWellId` из URL;
  - клик по маркеру/строке записывает выбранный ID в `search`;
  - переход в реестр сохраняет workspace-контекст (`workspaceFocus=registry`);
  - клик из инспектора на карточку сохраняет текущий контекст и источник (`workspaceFocus=map`).
- В `/geology/wells`:
  - сохранение selection в URL (`selectedWellId`) и использование его для выделения строки;
  - сохранение `workspaceFocus` для перехода обратно на карту;
  - строки списка поддерживают клавиатурный fallback (`↑/↓/Home/End`) с фокусом строки;
  - сохранённые представления не привязываются к текущему `selectedWellId` (сравнение только по фильтрам);
  - переход в карточку скважины сохраняет текущие `filters/workspace`.
- `src/pages/geology/wellTabSearch.ts` и `src/pages/geology/WellDetailsPage.tsx` расширены для shared workspace в карточке:
  - маршрут карты-реестра-карточка теперь поддерживает контекстный `tab` + workspace в URL;
  - back-link на карточке возвращает пользователя в карту, если фокус был картой, или в реестр — если из реестра.
- Добавлены regression тесты:
  - `src/pages/geology/wellSearch.test.ts` — контракт `wellSearch`;
  - `src/pages/geology/wellTabSearch.test.ts` — контракт `wellTabSearch` для передачи workspace и вкладки.

## Статус T10

**СТАТУС: DONE (phase 2: map + registry + card loop)**

Верификация выполнена:
- fallback-выбор при пустом фильтре;
- round-trip по URL между `/geology/map` ↔ `/geology/wells` ↔ `/objects/wells/$wellId`;
- возврат из карточки в исходный экран.

## Отдельные артефакты для передачи следующим сессиям

- `src/pages/geology/wellSearch.ts` — единый контракт search-состояния;
- `src/pages/geology/wellTabSearch.ts` — валидация карточного search с workspace/tabs;
- `src/pages/geology/GeologyMapPage.tsx` — cross-selection + URL sync;
- `src/pages/geology/WellsPage.tsx` — shared selection + keyboard fallback + переход в карточку с контекстом;
- `src/pages/geology/WellDetailsPage.tsx` — возврат на исходный экран по workspace-focus;
- `src/pages/geology/wellSearch.test.ts` — валидация и устойчивость контракта search;
- `src/pages/geology/wellTabSearch.test.ts` — контракт для карточного маршрута.




