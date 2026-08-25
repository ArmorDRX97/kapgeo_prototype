# Детализация и расширение геологического модуля

## 1. Назначение комплекта

Этот каталог — рабочая спецификация полной доработки геологического контура AI KAPGEO по руководству пользователя `РП по геологическому модулю.pdf` из корня проекта. Он предназначен для владельцев продукта, разработчиков, тестировщиков и следующих AI-сессий.

Комплект отвечает на четыре вопроса:

1. какой профессиональный функционал описан в руководстве;
2. что из него уже представлено в кликабельном прототипе и насколько честно;
3. каким должен стать целевой web-процесс с учётом действующих правил AI KAPGEO;
4. в какой последовательности реализовывать расширение без разрыва сквозных зависимостей.

Документация не объявляет legacy desktop-интерфейс целевым дизайном. Руководство используется как источник предметных операций, зависимостей и расчётных сценариев. Целевые UX, безопасность, версии, права, аудит, фоновые задачи, локализация и доступность определяются основной документацией `docs/ui-ux/`.

## 2. Изученные источники

Основной предметный источник:

- `РП по геологическому модулю.pdf`, 339 страниц;
- пять связанных программных контуров: «Скважина», «Геотехнологический разрез», «Запасы», «2D геологическое моделирование», «3D геологическое моделирование»;
- текст всех 339 страниц распознан и сопоставлен с визуальной структурой;
- изучены все 199 растровых изображений из корневого каталога `screenshots/` и их индекс `screenshots/index.csv`;
- рисунок 1.32 на странице 66 является векторной схемой конструкции скважины и не входит в набор 199 растровых скриншотов; он также учтён.

Контекст целевой системы:

- `docs/ui-ux/01-product-brief.md`;
- `docs/ui-ux/modules/02-geology.md`;
- `docs/ui-ux/modules/04-modeling.md`;
- `docs/ui-ux/02-roles-access.md`;
- `docs/ui-ux/03-information-architecture.md`;
- `docs/ui-ux/04-screen-catalog.md`;
- `docs/ui-ux/05-cross-module-flows.md`;
- `docs/ui-ux/06-design-system.md`;
- `docs/ui-ux/07-prototype-architecture.md`;
- `docs/ui-ux/08-mock-data.md`;
- `docs/ui-ux/09-roadmap-backlog.md`;
- `docs/ui-ux/10-acceptance-demo.md`;
- `docs/ui-ux/11-traceability-open-questions.md`;
- текущий React/TypeScript-код и `docs/implementation-status.md`.

Повторно извлекать или заново анализировать PDF в следующих сессиях не требуется. Обращаться к нему следует только для проверки конкретной формулы, подписи или неоднозначности, уже указанной в матрице трассировки.

## 3. Состав комплекта и порядок чтения

| Документ | Когда читать | Результат |
|---|---|---|
| [01-source-functional-inventory.md](./01-source-functional-inventory.md) | при проверке полноты legacy-функций | инвентаризация операций, правил, входов и выходов по пяти главам |
| [02-current-state-gap-analysis.md](./02-current-state-gap-analysis.md) | перед планированием изменения прототипа | точное сопоставление `есть → не хватает → действие` |
| [03-target-product-specification.md](./03-target-product-specification.md) | перед UX, domain и acceptance | целевой процесс, рабочие области, статусы, права и правила |
| [04-target-architecture-integration.md](./04-target-architecture-integration.md) | перед проектированием backend/frontend | границы модулей, сущности, API, jobs, события и миграция прототипа |
| [05-prototype-epics-backlog.md](./05-prototype-epics-backlog.md) | основной implementation backlog текущего этапа | 13 эпиков и 137 задач кликабельного прототипа с IndexedDB persistence/reset |
| [05-roadmap-epics-backlog.md](./05-roadmap-epics-backlog.md) | только как future-production reference | полная предметная декомпозиция, не являющаяся текущим DoD |
| [06-implementation-playbook.md](./06-implementation-playbook.md) | в каждой реализации vertical slice | рабочая последовательность, DoR/DoD, тесты и обновление документации |
| [07-traceability-matrix.md](./07-traceability-matrix.md) | при ревью scope и приёмке | связь страниц/рисунков руководства с целевыми экранами и эпиками |
| [08-open-questions-decisions.md](./08-open-questions-decisions.md) | до расчётного backend и утверждения UX | принятые решения, блокеры и вопросы предметным владельцам |
| [22-geology-guided-tour-verification.md](./22-geology-guided-tour-verification.md) | при изменении геологических routes, panels или обучения | каталог 74 шагов, persistence, reset, расширение и browser acceptance экскурсии |

Минимальный маршрут для новой сессии: этот файл → текущий статус → нужный эпик в `05-prototype-epics-backlog.md` → соответствующая спецификация в документе 03 → архитектурные контракты в документе 04 → трассировка в документе 07.

## 4. Главный вывод анализа

Геологический модуль нельзя расширять как набор независимых вкладок. Руководство описывает зависимый конвейер:

`месторождение и кондиции → паспорт скважины → первичные интервалы и измерения → интерпретации → геологическая колонка → геотехнологический разрез → рудные пересечения и блоки → расчёт запасов → 2D/3D геологические модели → публикация потребителям`.

Любое изменение upstream-данных должно создавать новую версию, показывать impact preview и управляемо переводить downstream-артефакты в `stale`, а не молча пересчитывать или оставлять противоречивый результат.

## 5. Что переносится, адаптируется и не переносится буквально

### Сохраняется как предметная функция

- полный паспорт скважины, бурение, освоение, геология и конструкция;
- керновые рейсы, промер, привязка керна, литология и стратиграфия;
- все семейства ГИС, импорт, преобразование и объединение кривых;
- инклинометрия и расчёт геометрии ствола;
- проницаемые/технологические и рудные интервалы, объединения и эффективная мощность;
- керновые, гранулометрические, литогеохимические и технологические пробы;
- профессиональные колонки, легенды, векторный экспорт и печатные пакеты;
- редакторы разреза, ритмопачек, фундамента, рудных тел и зон окисления;
- четыре метода подсчёта запасов и планы запасов;
- геометрия, сетка, анализ данных, вариография, интерполяция, 2D/3D-модель и визуализация.

### Адаптируется к общей платформе

- отдельные desktop-программы становятся связанными рабочими областями единой web-системы;
- ручное подключение к БГД заменяется платформенным data source/integration layer;
- глобальные кнопки `Применить/Отмена` заменяются draft, явным diff, optimistic concurrency и workflow;
- прямой SQL пользователя заменяется сохранёнными фильтрами и административно управляемыми dataset/view definitions;
- долгие расчёты, импорты и экспорты выполняются как наблюдаемые фоновые задачи;
- Word/Excel/принтер-зависимые операции заменяются серверным генератором PDF/XLSX/SVG/DXF и историей экспортов;
- desktop-контекстные меню дублируются видимыми командами и клавиатурно доступными действиями.

### Не переносится

- Windows/Access/USB-key/Office-зависимость;
- хранение паролей БД и выбор СУБД предметным пользователем;
- неограниченный пользовательский SQL в рабочем интерфейсе;
- молчаливое уничтожение импортируемых данных;
- изменение утверждённого результата на месте;
- автоматический расчёт без фиксированного входного snapshot и версии алгоритма;
- визуальная стилистика и компоновка legacy desktop-приложения.

## 6. Граница геологии и модуля моделирования

Руководство включает 2D/3D геологическое моделирование в геологический пакет, но AI KAPGEO уже имеет отдельный модуль моделирования. Целевая граница следующая:

- геология владеет утверждёнными скважинными данными, интерпретациями, горизонтами, рудными телами, рудными пересечениями, проектами запасов и опубликованной геологической версией;
- модуль моделирования предоставляет переиспользуемые движки domain/grid, variography, interpolation, background run, result fields и 2D/3D rendering;
- пользователь может запустить «Геологическое моделирование» из геологического контекста, но вычислительный проект открывается в общей modeling workspace с зафиксированным geological input snapshot;
- результат возвращается в геологию только через review/accept/publication, после чего может участвовать в подсчёте запасов;
- геология не получает второй, несовместимый движок сеток и вариографии.

## 7. Текущий статус

На 24 августа 2026 года текущая поставка зафиксирована как кликабельный демонстрационный сайт на GitHub Pages. Все данные synthetic; целевое локальное хранилище — IndexedDB `kapgeo-demo` с deterministic seed, persistence после reload и глобальным reset.

GEOX-E01 завершён: `DemoDatabase` хранит deterministic synthetic world в IndexedDB `kapgeo-demo`; repository adapters, версии/зависимости, jobs/artifacts/audit и map workspace preferences переживают reload. Profile содержит подтверждаемый глобальный reset, возвращающий seed. Детали и команды проверки — в [09-e01-indexeddb-verification.md](./09-e01-indexeddb-verification.md).

GEOX-E02 завершён: маршрут /geology/master даёт сохраняемые месторождения, участки, залежи и versioned кондиции; wizard скважины собирает принадлежность и блокирует spatial/duplicate сценарии; карточка объединяет полный паспорт, construction interval/point editor и permission-based review/publish. Все данные остаются synthetic, живут в IndexedDB и сбрасываются глобальным reset. Детали — в [10-e02-well-master-verification.md](./10-e02-well-master-verification.md).
GEOX-E03 завершён: вкладка бурения получила сохраняемый survey/trajectory/core workspace: fixture import с mapping/diff/protocol, deterministic trajectory job, depth mapping, boxes/barcodes, validation, undo/redo и CSV export. Все данные synthetic и сбрасываются reset. Детали — в [11-e03-trajectory-core-verification.md](./11-e03-trajectory-core-verification.md).
GEOX-E04 завершён: версия-ориентированный workspace литологии и проб хранит core/log/composite/stratigraphy tracks, dictionaries, overrides, sample/lab chain, granulometry, batch labels и LIMS staging. Все данные synthetic/IndexedDB и сбрасываются reset. Детали — в [12-e04-geology-samples-verification.md](./12-e04-geology-samples-verification.md).
GEOX-E05 завершён: versioned workspace ГИС поддерживает bundled/local fixture, parser profile, mapping/QC, atomic LogRun, bounded LogViewer, templates, derived/merged curves и main-curve impact. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [13-e05-logs-verification.md](./13-e05-logs-verification.md).
GEOX-E06 завершён: versioned workspace интерпретаций поддерживает permeable/filtration/differential/ore/tech tracks, manual и auto proposals, synthetic AI, human resolution и review/publish. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [14-e06-interpretations-verification.md](./14-e06-interpretations-verification.md).
GEOX-E07 завершён: output workspace даёт versioned SVG-column, templates, annotations/legend, client-side export, documents, GIS-like map и managed views. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [15-e07-outputs-verification.md](./15-e07-outputs-verification.md).
GEOX-E08 завершён: SectionProject workspace поддерживает route/corridor, correlation scene, connectivity, helpers, contours, ore/oxidation, auto-repair и drawing artifact. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [16-e08-sections-verification.md](./16-e08-sections-verification.md).
GEOX-E09 завершён: ReserveProject workspace хранит intersections/blocks/well sets/cells, четыре независимых synthetic method runs, compare, plan и passport publication. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [17-e09-reserves-verification.md](./17-e09-reserves-verification.md).
GEOX-E10 завершён: 2D ModelProject workspace хранит domain/grid, source decisions, analysis, variogram/CV, четыре interpolation runs, accepted field/contours и outputs. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [18-e10-2d-model-verification.md](./18-e10-2d-model-verification.md).
GEOX-E11 завершён: DGM workspace хранит horizon hierarchy/picks/surfaces, plan/volume mesh, 3D analysis/fields, composition, slices/render fallback и publication export. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [19-e11-dgm-verification.md](./19-e11-dgm-verification.md).

## 8. Правило полноты

Функция из руководства считается покрытой только если выполнены все условия:

1. определён владелец данных и permission;
2. описаны входы, выходы, единицы и provenance;
3. предусмотрены create/edit/view, validation, draft/version и audit;
4. определено влияние на downstream-объекты;
5. реализованы loading, empty, error, forbidden, read-only, stale и conflict states;
6. команда изменяет состояние или создаёт проверяемый job/result, а не является декоративной;
7. есть unit/integration/e2e-проверка и трассировка к источнику;
8. расчёт имеет immutable snapshot, версию метода и воспроизводимый результат.

GEOX-E12 завершён: publication workspace хранит exact-version package, approval/reauth/signature placeholder, consumer handoff, withdrawal/replacement, export history, locale/accessibility/performance/policy/browser QA и regression evidence. Данные synthetic/IndexedDB и сбрасываются reset. Детали — в [20-e12-publication-hardening-verification.md](./20-e12-publication-hardening-verification.md).


GEOX-E00 завершён: `/geology/methodology` хранит walkthrough пяти контуров, четыре versioned synthetic method definitions/examples, conditions/dictionaries с impact, output templates и volume profiles. Baseline `unverified`, данные IndexedDB и сбрасываются reset. Детали — в [21-e00-methodology-verification.md](./21-e00-methodology-verification.md).


