# AI KAPGEO — основная документация

Этот файл — первая точка входа для новой сессии, разработчика или AI-агента. Повторно анализировать исходные DOCX/PDF/PPTX не требуется: выводы уже сведены в `docs/ui-ux/`.

## Читать в начале каждой сессии

1. [Продуктовая модель](./ui-ux/01-product-brief.md) — что это за система и где её границы.
2. [Текущий статус реализации](./implementation-status.md) — что уже работает и какой следующий срез.
3. Этот файл и корневой [`AGENTS.md`](../AGENTS.md) — порядок работы и запрет на повторное сканирование архива.

## Читать по необходимости

| Задача | Документы |
|---|---|
| роли, вход, профиль, доступ | [02-roles-access.md](./ui-ux/02-roles-access.md), [общая платформа](./ui-ux/modules/01-common-platform.md) |
| навигация и маршруты | [03-information-architecture.md](./ui-ux/03-information-architecture.md), [04-screen-catalog.md](./ui-ux/04-screen-catalog.md) |
| бизнес-процессы и состояния | [05-cross-module-flows.md](./ui-ux/05-cross-module-flows.md) |
| визуальный стиль и компоненты | [06-design-system.md](./ui-ux/06-design-system.md), [12-glossary-content.md](./ui-ux/12-glossary-content.md) |
| встроенное руководство пользователей | `/help` в приложении, [структура и удаление](../src/help-center/README.md) |
| React-архитектура | [07-prototype-architecture.md](./ui-ux/07-prototype-architecture.md) |
| fake data и demo-сценарии | [08-mock-data.md](./ui-ux/08-mock-data.md) |
| планирование и бэклог | [09-roadmap-backlog.md](./ui-ux/09-roadmap-backlog.md) |
| приёмка и демонстрация | [10-acceptance-demo.md](./ui-ux/10-acceptance-demo.md) |
| источники, решения и вопросы | [11-traceability-open-questions.md](./ui-ux/11-traceability-open-questions.md) |
| геология | [02-geology.md](./ui-ux/modules/02-geology.md) |
| технология | [03-technology.md](./ui-ux/modules/03-technology.md) |
| моделирование | [04-modeling.md](./ui-ux/modules/04-modeling.md) |
| аналитика | [05-analytics.md](./ui-ux/modules/05-analytics.md) |
| администрирование | [06-administration.md](./ui-ux/modules/06-administration.md) |

Полный индекс комплекта: [docs/ui-ux/README.md](./ui-ux/README.md).

## Приоритет источников

1. Зафиксированные решения и требования в `docs/ui-ux/`.
2. Текущий код и тесты — для фактически реализованного поведения.
3. Журнал открытых вопросов — если решение ещё не принято.
4. Архивные первоисточники — только точечно и только если основных документов недостаточно.

## Архив

`archive/` содержит тяжёлые исходники и одноразовые результаты их извлечения/рендеринга. Его нельзя включать в обычный поиск, инвентаризацию или контекст новой сессии. Правило закреплено в корневом `AGENTS.md`, `.rgignore` и вложенном `archive/AGENTS.override.md`.

Если редкое обращение к первоисточнику действительно необходимо:

1. сначала найти конкретный вопрос и источник в [трассировке](./ui-ux/11-traceability-open-questions.md);
2. открыть только названный файл;
3. перенести новый вывод в основную Markdown-документацию;
4. снова продолжить работу только по `docs/`.

## Рабочий порядок

1. Выбрать один вертикальный сценарий.
2. Проверить его экраны, роли, данные и состояния по документации.
3. Реализовать route → UI → mock behavior → проверку.
4. Обновить статус реализации и связанные спецификации.
5. Не объявлять готовыми декоративные кнопки без состояния и результата.
