# Интерактивная экскурсия по геологическому модулю

Дата реализации: 25 августа 2026 года.

## 1. Назначение

Экскурсия — встроенный слой обучения для пользователей с effective permission `geology.view`. Она помогает заказчику, аналитику, разработчику и профильному пользователю последовательно пройти геологический модуль, не заменяя предметную документацию и не изменяя synthetic-данные без явного действия пользователя.

Фиксированная кнопка `Экскурсия` расположена в правом нижнем углу shell. Нажатие открывает соседнее окно выбора сценария. Во время экскурсии система:

- переходит на нужный route и вкладку;
- ждёт завершения асинхронной загрузки рабочей области;
- затемняет остальную страницу и подсвечивает целевой элемент;
- показывает цель, объяснение и практическую подсказку;
- поддерживает `Назад`, `Далее`, `Позже`, `Escape`, стрелки клавиатуры и удержание focus внутри dialog;
- при изменившемся или недоступном элементе подсвечивает страницу целиком и позволяет продолжить;
- сохраняет позицию, завершённые сценарии и состояние launcher в IndexedDB.

## 2. Сценарии

| ID | Сценарий | Охват |
|---|---|---|
| `geology-complete` | Полная экскурсия | 80 шагов по всему текущему геологическому модулю |
| `geology-start` | Первое знакомство | контекст, дата, поиск, обзор, карта, реестр и создание скважины |
| `geology-bgd` | БГД и месторождения | реестр, фильтры, создание, редактор, dependency guard и режим фокуса |
| `geology-well` | Карточка скважины | все вкладки WELL-1042, включая связанные planned routes |
| `geology-logs` | ГИС и интерпретация | импорт, QC, LogRun, viewer, интервалы, AI и human resolution |
| `geology-projects` | Разрезы, запасы и публикация | SectionProject, ReserveProject, review и exact-version delivery |
| `geology-methods` | Справочники и методики | master data, пять контуров, четыре метода, условия и templates |
| runtime | Обзор текущей страницы | автоматически собирает видимые page header, tabs, panels и savebars |

Runtime-обзор нужен для новых экранов: стандартные `PageHeader`, `Panel`, `.object-tabs` и `.workspace-savebar` попадают в обучение автоматически. Для предметно точного текста новый экран дополнительно включается в `model/catalog.ts` отдельными шагами.

## 3. Route-покрытие

Полный сценарий содержит шаги для:

- `/geology`, `/geology/master`, `/geology/methodology`;
- `/geology/map`, `/geology/wells`, `/geology/wells/new`;
- `/objects/wells/WELL-1042` и вкладок `passport`, `drilling`, `lithology`, `logs`, `samples`, `documents`, `audit`, `technology`, `equipment`, `model`;
- `/geology/interpretations/INT-WELL-1042-07/compare`;
- `/geology/correlation`, `/geology/reserves`, `/geology/delivery`.

Каталог объясняет не только страницы, но и основные операции: version/draft, impact, trajectory/core commands, geological tracks, sample/lab/LIMS chain, LAS mapping/QC, LogViewer, manual/AI/resolved interpretation, output/export/documents/map, audit, section, четыре reserve methods, review и publication.

## 4. Persistence и reset

Preference хранится в store `preferences` базы `kapgeo-demo` под ключом:

`tour:geology:<personaId>`

Поля: `activeTourId`, `stepIndex`, `lastRoute`, `completedTourIds`, `launcherSeen`, `updatedAt`. Прогресс раздельный для каждой persona. Запись выполняется через repository/API, страница не обращается к IndexedDB напрямую.

Доступны два reset:

1. `Сбросить прогресс обучения` в меню экскурсии — очищает только active/completed tour state текущей persona;
2. глобальный reset в профиле — удаляет всю базу `kapgeo-demo`, включая прогресс экскурсий, и восстанавливает deterministic seed.

## 5. Расширение

Чтобы добавить новый тематический шаг:

1. использовать устойчивый selector или добавить семантический `data-*` target;
2. добавить шаг в тематическую группу `src/features/geology-tour/model/catalog.ts`;
3. включить группу в полную и нужную тематическую экскурсию;
4. расширить список required routes в `catalog.test.ts`;
5. проверить desktop/mobile overlay, route transition, target fallback и клавиатуру.

Контент шага не должен объявлять synthetic-расчёт производственным, скрывать статус версии или подменять human decision автоматическим.

## 6. Реализованные файлы

- `src/features/geology-tour/GeologyTour.tsx` — launcher, menu, overlay, navigation и focus;
- `src/features/geology-tour/model/runtime.ts` — поиск target и автоматический runtime tour текущей/будущей страницы;
- `src/features/geology-tour/model/catalog.ts` — полный и тематические каталоги;
- `src/features/geology-tour/geology-tour.css` — desktop/mobile/reduced-motion UI;
- `src/repository/demo/geologyTourRepository.ts` — IndexedDB preference adapter;
- `src/entities/geology-tour/model/types.ts` — persisted contract;
- `src/app/layout/AppShell.tsx` — глобальное подключение по permission.

## 7. Проверки

Автоматические проверки:

- catalogue coverage всех текущих geology routes и well tabs;
- уникальность tour/step IDs и наличие action targets;
- fixed launcher → menu → complete tour → dialog;
- автоматическая генерация тура текущей/будущей страницы;
- persona-specific persistence, resume/completed state и global reset;
- общий `typecheck`, полный Vitest suite и production build.

Browser acceptance выполнена в изолированном Chrome:

- desktop `1440 × 900`: launcher `140 × 48`, соседнее menu `430 × 720`, первый target и tooltip не пересекаются;
- mobile `390 × 844`: menu `366 × 720`, tooltip закреплён снизу, target остаётся видимым, page overflow равен `0`;
- базовый проход до расширения БГД открыл `21` route/URL-вариант; все прежние 74 target найдены, fallback и missing highlight отсутствуют;
- incremental Chrome acceptance БГД подтвердил 6/6 новых target на `/geology/bgd`, включая fixed переключатель режима; текущий полный каталог содержит 80 шагов;
- переходы `/geology → /geology/master` и `WELL-1042 → ?tab=passport` подтверждены;
- pause/reload показал `Продолжить` на шаге 8, локальный reset удалил resume;
- launcher виден для R1 с `geology.view` и отсутствует у R8 без такого permission;
- финал полного тура закрыл dialog и записал завершение;
- после расширения БГД проходят `typecheck`, `45` test files / `111` tests, `lint` и production `build`; lint содержит только три прежних warnings.
