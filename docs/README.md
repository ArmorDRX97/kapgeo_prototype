# AI KAPGEO — документация прототипа

Основная ветка содержит рабочий геологический модуль БГД в расширяемой многомодульной оболочке. Технология, моделирование и аналитика представлены безопасными заглушками, администрирование — минимальным рабочим контуром. Полный прежний прототип зафиксирован в ветке `archive/full-prototype-2026-09-15`; эту ветку не следует использовать для текущей разработки.

## Читать в начале работы

1. [Продуктовая модель](./ui-ux/01-product-brief.md).
2. [Текущий статус реализации](./implementation-status.md).
3. Корневой [`AGENTS.md`](../AGENTS.md).

## Документы по задачам

| Задача | Документ |
|---|---|
| роли и доступ | [02-roles-access.md](./ui-ux/02-roles-access.md) |
| маршруты и экраны | [03-information-architecture.md](./ui-ux/03-information-architecture.md), [04-screen-catalog.md](./ui-ux/04-screen-catalog.md) |
| сценарии | [05-cross-module-flows.md](./ui-ux/05-cross-module-flows.md) |
| дизайн и терминология | [06-design-system.md](./ui-ux/06-design-system.md), [12-glossary-content.md](./ui-ux/12-glossary-content.md) |
| React-архитектура | [07-prototype-architecture.md](./ui-ux/07-prototype-architecture.md) |
| synthetic data | [08-mock-data.md](./ui-ux/08-mock-data.md) |
| приёмка | [10-acceptance-demo.md](./ui-ux/10-acceptance-demo.md) |
| открытые вопросы | [11-traceability-open-questions.md](./ui-ux/11-traceability-open-questions.md) |
| реализация БГД | [пакет проверок](./geology-functional-expansion/README.md) |

`archive/` не используется при обычной работе и не должен попадать в широкие поиски.
