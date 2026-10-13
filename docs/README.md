# AI KAPGEO — документация прототипа

Основная ветка содержит рабочий БГД. С 12.10.2026 «Геология» снова доступна: второй уровень содержит автономные «Геотехнологические разрезы» и существующую «Интерпретацию». Пять заключительных задач автономного прототипа разрезов завершены 13.10.2026; промышленная полнота РП не заявляется. Интерпретация использует Canvas-планшет `@kapgeo/geo-viz/wellog` из основного фронтенда и отдельный вымышленный набор данных. Технология, моделирование и аналитика представлены безопасными заглушками, администрирование — минимальным рабочим контуром. Полный прежний прототип зафиксирован в ветке `archive/full-prototype-2026-09-15`; эту ветку не следует использовать для текущей разработки.

## Читать в начале работы

1. [Продуктовая модель](./ui-ux/01-product-brief.md).
2. [Текущий статус реализации](./implementation-status.md).
3. Корневой [`AGENTS.md`](../AGENTS.md).

## Документы по задачам

| Задача | Документ |
|---|---|
| интерпретация по «Альфа 2018» | [рабочий этап 1 и его границы](../geo-module-refs/Interpretation/implementation-stage-1.md), [исследование/контекст](../geo-module-refs/Interpretation/README.md) |
| реалистичный общий пример разреза по кадрам видео | [визуальная сверка, данные, техническое устройство и проверка](../geo-module-refs/reference-reconstruction.md) |
| роли и доступ | [02-roles-access.md](./ui-ux/02-roles-access.md) |
| маршруты и экраны | [03-information-architecture.md](./ui-ux/03-information-architecture.md), [04-screen-catalog.md](./ui-ux/04-screen-catalog.md) |
| сценарии | [05-cross-module-flows.md](./ui-ux/05-cross-module-flows.md) |
| дизайн и терминология | [06-design-system.md](./ui-ux/06-design-system.md), [12-glossary-content.md](./ui-ux/12-glossary-content.md) |
| React-архитектура | [07-prototype-architecture.md](./ui-ux/07-prototype-architecture.md) |
| synthetic data | [08-mock-data.md](./ui-ux/08-mock-data.md) |
| приёмка | [10-acceptance-demo.md](./ui-ux/10-acceptance-demo.md) |
| открытые вопросы | [11-traceability-open-questions.md](./ui-ux/11-traceability-open-questions.md) |
| сворачиваемые группы инструментов/общая справка, центральный график, меню/реестр геологии, drag точек, заголовки колонок и pan/zoom | [обновление рабочего места геологии](./task/geology-workspace-refresh.md) |
| навигация и рабочая область БГД | [обновление структуры](./task/bgd-workbench-refresh.md) |
| реализация БГД | [пакет проверок](./geology-functional-expansion/README.md) |
| интерпретация по РП 1.24–1.26 | [текущее состояние, проверка и исследования](./task/README.md), [геологический модуль](./ui-ux/modules/02-geology.md) |
| геотехнологические разрезы и второй уровень геологии | [план реализации](../geo-module-refs/geology-implementation-plan.md), [аудит видео](../geo-module-refs/video-audit.md), [руководство](../geo-module-refs/manual-review.md), [требования/приёмка](../geo-module-refs/requirements-matrix.md), [итог реализации и техническое устройство](../geo-module-refs/geology-implementation-report.md) |
| управление справочниками | [03-reference-data.md](./ui-ux/modules/03-reference-data.md) |
| образовательная карта предметной области | отдельное локальное приложение `kapgeo-knowledge-map/`; по запросу пользователя от 13.10.2026 исключено из Git и CI. Инструкции находятся внутри локальной папки |
| среда Product Design / UX / UI для Codex | [skills, источники, Windows QA и проверки](./task/product-design-environment.md) |

`archive/` не используется при обычной работе и не должен попадать в широкие поиски.
