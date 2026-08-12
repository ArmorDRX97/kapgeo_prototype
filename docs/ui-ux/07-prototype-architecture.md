# Архитектура кликабельного React-прототипа

## 1. Цель

Прототип должен быть достаточно реалистичным для проверки UX и достаточно дисциплинированным для передачи frontend-команде. Это не статическая «витрина»: маршруты, права, состояния, формы, фоновые задачи и demo-данные работают согласованно.

Архитектура не имитирует production backend и не переносит предметные расчёты в браузер. Контракты и границы слоёв создаются так, чтобы мок-API позже можно было заменить реальным.

## 2. Рекомендуемый стек

| Область | Решение | Почему |
|---|---|---|
| UI | [React + TypeScript](https://react.dev/learn/typescript) | компонентная модель и типизация |
| сборка | [Vite](https://vite.dev/guide/) | быстрый dev/build для SPA |
| маршруты | [TanStack Router](https://tanstack.com/router/latest/docs/overview) | типизированные routes, params и search state |
| server state | [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) | cache, загрузки, mutation и invalidation |
| таблицы | [TanStack Table](https://tanstack.com/table/latest/docs/guide/virtualization) + virtualizer | headless data grid и большие наборы |
| схемы | [Zod](https://zod.dev/packages/zod) | единые runtime-схемы данных и форм |
| mock API | [Mock Service Worker](https://mswjs.io/) | перехват на сетевом уровне в browser/tests |
| карта | [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) | интерактивные карты и слои |
| графики | [Apache ECharts](https://echarts.apache.org/en/feature.html) | плотные временные и аналитические визуализации |
| каталог UI | [Storybook](https://storybook.js.org/docs/writing-tests) | изолированные состояния и component tests |
| e2e | [Playwright](https://playwright.dev/docs/browsers) | Chromium/Firefox/WebKit и сценарии browser UI |

Точные версии фиксируются при создании приложения после проверки совместимости. Не следует копировать версии из документации в `package.json` вручную.

## 3. Репозиторная структура

```text
src/
├── app/                 # bootstrap, router, providers, shell
├── pages/               # композиция route-level экранов
├── widgets/             # крупные независимые области страницы
├── features/            # пользовательские действия и workflows
├── entities/            # предметные типы, UI и API сущностей
├── shared/
│   ├── api/             # client, errors, pagination, schemas
│   ├── auth/            # session, permissions, scopes
│   ├── config/          # environments, feature flags
│   ├── i18n/            # RU/KZ/EN
│   ├── lib/             # formatters, units, dates, geo helpers
│   ├── ui/              # design-system primitives
│   └── styles/          # tokens, themes, global CSS
├── mocks/
│   ├── data/            # generated fixtures
│   ├── handlers/        # MSW handlers
│   ├── scenarios/       # deterministic demo states
│   └── generator/       # seed-based generator
└── tests/
    ├── fixtures/
    ├── accessibility/
    └── e2e/
```

Правило зависимостей: `app → pages → widgets → features → entities → shared`. Нижние слои не импортируют верхние. Предметный компонент может жить в `entities`, если он не инициирует workflow; действие согласования — в `features`.

## 4. Границы модулей

```text
domains/
├── common
├── geology
├── technology
├── modeling
├── analytics
└── administration
```

Модули не импортируют внутренние файлы друг друга. Общение идёт через публичный `index.ts`, общие entity IDs и навигационные contracts. Единая карточка скважины композирует вкладки через registry, а не знает реализацию каждой вкладки.

## 5. Маршрутизация

- route tree повторяет [информационную архитектуру](./03-information-architecture.md);
- context, `asOf`, scenario, view и shareable selection валидируются схемой;
- права проверяются и на ветви маршрута, и на конкретном действии;
- loader может prefetch critical queries;
- 404, forbidden и expired session — разные состояния;
- lazy boundaries устанавливаются по модулю и тяжёлому workspace;
- карта/графики/редакторы загружаются только при открытии;
- deep link имеет migration strategy при изменении route.

## 6. Состояние

| Вид | Где хранить |
|---|---|
| server-like data | TanStack Query cache |
| URL-shareable filter | router search params |
| form draft | form state + draft storage при необходимости |
| shell UI | небольшой app store/context |
| theme/language/density | profile settings + local cache |
| selection внутри canvas | локальное состояние workspace |
| demo scenario | query param + mock scenario registry |

Не допускается единый глобальный store со всеми сущностями. Derived values вычисляются из нормализованных данных и memoized selectors, а не дублируются.

## 7. API-контракт прототипа

Базовая форма:

```ts
type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
    asOf: string;
    version?: string;
    warnings?: ApiWarning[];
  };
};

type ApiProblem = {
  type: string;
  title: string;
  status: number;
  detail: string;
  requestId: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
};
```

Списки используют cursor pagination либо windowing contract; фильтры и сортировка передаются явно. Mutation принимает `expectedVersion`, чтобы прототип мог показать optimistic concurrency conflict.

## 8. Версионность и согласование

Каждая versioned entity имеет:

```ts
type VersionMeta = {
  versionId: string;
  revision: number;
  status: 'draft' | 'review' | 'changes_requested' |
    'verified' | 'approval' | 'approved' | 'archived';
  createdAt: string;
  createdBy: UserRef;
  basedOn?: string;
  effectiveFrom?: string;
  approvedAt?: string;
};
```

Workflow transitions приходят как доступные actions от API/mocks. UI не выводит право только из роли: он использует permissions + entity state + scope. Это предотвращает расхождение с будущим backend.

## 9. Права и demo-персоны

`AuthSession` содержит пользователя, роли, scopes, permissions, язык и срок сессии. Проверки:

- `RouteGuard` — доступ к области;
- `Can` — видимость/disabled действия;
- `useAvailableActions(entity)` — операции с учётом статуса;
- server/mocked handler повторно проверяет mutation;
- forbidden response не раскрывает данные.

В DEMO доступен persona switcher. Он меняет session и приводит пользователя на разрешённую домашнюю страницу, но не обходит модель прав.

## 10. Mock Service Worker и сценарии

MSW handlers реализуют те же URL и schemas, что ожидаются от backend. Сценарий задаётся параметром `?demoScenario=` или панелью только в DEMO.

Обязательные режимы:

- нормальная сеть;
- задержка 1–3 секунды;
- пустая выборка;
- частичный ответ с warning;
- validation error;
- 401 и session expiry;
- 403 scope restriction;
- 409 version conflict;
- 422 domain validation;
- 500 retryable/non-retryable;
- background job queued/running/failed/succeeded;
- integration delayed;
- offline/read-only snapshot.

Mutation меняет in-memory demo database; reload может сохранять состояние в IndexedDB/localStorage. Кнопка `Сбросить demo` восстанавливает seed.

## 11. Сложные рабочие области

Карта, схема, LogViewer, разрез и сетка используют общий contract:

```ts
type WorkbenchSelection = {
  objectIds: string[];
  interval?: { from: number; to: number };
  timeRange?: { from: string; to: string };
  geometry?: unknown;
};
```

Общий selection связывает canvas, таблицу, график и inspector. Rendering adapters изолируют MapLibre/ECharts от бизнес-компонентов. Для объёмных данных прототип использует downsampling/aggregation и synthetic tiles; он не загружает десятки тысяч DOM-узлов.

## 12. Формы, единицы и вычисления

- Zod-schema задаёт shape и базовые проверки;
- domain validator возвращает межполевые и серверные ошибки;
- UI хранит введённое значение отдельно от нормализованного;
- единица входит в metadata поля;
- дата и время передаются ISO 8601; отображение locale-aware;
- координаты содержат CRS;
- prototype calculations помечаются `DEMO` и имеют тестируемую формулу;
- никаких случайных чисел при каждом render.

## 13. Performance budget

Целевые ограничения для demo на типовом ноутбуке:

- shell становится интерактивным до 2,5 s после холодной загрузки;
- смена локального фильтра даёт feedback до 100 ms;
- открытие drawer до 200 ms;
- таблица 10 000 строк не рендерит все строки;
- тяжёлый модуль не входит в initial bundle;
- карта плавно работает на synthetic dataset принятого объёма;
- long task никогда не блокирует UI.

Значения являются UX-budget прототипа, а не SLA промышленной системы.

## 14. Тестовая пирамида

### Unit

Форматирование, permissions, transitions, единицы, interval validation, генератор, преобразования API.

### Component/Storybook

Все состояния дизайн-системы, формы, DataGrid, Workbench panels, long translations, keyboard и accessibility checks.

### Integration

Route + query + MSW: импорт, согласование, version conflict, background job, session expiry.

### E2E

Минимум три вертикальных среза из [реестра экранов](./04-screen-catalog.md), роли R2/R6/R4/R12/R13, Chrome/Edge-equivalent и Firefox. Скриншотные тесты фиксируют критические workspaces на 1440 и 1024 px.

## 15. Quality gates

- TypeScript strict без необоснованного `any`;
- lint и format;
- unit/component/e2e tests;
- accessibility smoke;
- проверка битых маршрутов;
- bundle report;
- no console errors в demo;
- no real credentials/production data;
- source/license inventory для assets и библиотек;
- Storybook и приложение собираются из чистого checkout.

## 16. Передача backend-команде

Для каждого endpoint прототип должен сохранить:

- schema request/response/error;
- пример happy/error payload;
- правила permissions и scope;
- pagination/filter/sort semantics;
- expected version и idempotency для mutation;
- фоновые состояния и events;
- data provenance и units;
- links на экран и пользовательский сценарий.

## 17. Решения, которые нельзя «зашить» в прототип

- реальные пороги качества/AI и технологические нормативы;
- корпоративная IdP-конфигурация;
- реальная система координат по умолчанию;
- production URLs и секреты;
- окончательный формат электронной подписи;
- production объёмы и SLA;
- формулы подсчёта запасов/модели без утверждения эксперта.

Они оформляются конфигурацией или mock metadata и отмечаются в [журнале вопросов](./11-traceability-open-questions.md).
