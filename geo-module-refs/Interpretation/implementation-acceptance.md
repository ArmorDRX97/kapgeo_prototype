# Интерпретация Альфа: матрица реализации и приёмки

13.10.2026. Поэлементная сверка согласованного **автономного прототипа**. Источник — [РП Альфа 2018](../Руководство_пользователя_программы_Альфа_2018.pdf); номера PDF совпадают с печатными со страницы 2. Итог, формулы и ограничения — в [отчёте](./implementation-report.md). «Выполнено» означает проверенный локальный пользовательский сценарий; промышленное численное соответствие Альфе не заявлено.

## Требования и подтверждения

| ID / источник | Результат в прототипе | Код / фактическая проверка | Итог |
|---|---|---|---|
| A01 · перечень пользователя | Семь отдельных страниц; ТМ/ИК имеют собственные представления | `alphaTypes`, `router`, `AlphaWorkbench`; release QA проходит семь ссылок и прямую загрузку | Выполнено |
| A02 · КНД-м, прямое решение | Заглушка без фиктивного расчёта | `/knd`, browser methods/release QA; источника методики нет | Отложено по согласованию |
| A03 · с. 10–28 | Планшет, общий контекст/глубины/шкалы, несколько записей | `tracks`, `DisplaySettings`, `WellLog`; дополнительная ТМ/КМ, КС/ПС, порядок/ширины/сосед — stages 2/final appearance QA | Выполнено |
| A04 · с. 10–28 | Стили/пунктир/толщина/точки/заливка, подписи по глубине | `draw-track`, `NoteEditor`, `viewPreferences`, `PassportTracks`; tests + final appearance/export QA | Выполнено |
| A05 · с. 18–28 | Реквизиты, конкретное значение точки/единица/источник | `HeaderEditor`, `RecordInspector`, `contextInfo`; metadata Save/reload, keyboard Shift+F10, паспорт | Выполнено |
| A06 · UX KAPGEO | Wheel/кнопки/ЛКМ X/Y, постоянные размеры, рука только при drag | `well-log`, `AlphaCanvas.test`, final appearance QA с Escape; release zoom | Выполнено |
| A07 · с. 29–42 | ГК: источники, предварительный/финальный режим, поправки, два способа | `alphaGamma`, `MethodParameters`; `alphaGamma.test`, stage 3 profile QA, release calc | Выполнено локальным профилем |
| A08 · с. 36–47, 53–66 | Крр X/Y, морфология/С–С/С–Ж, борт/итерации/диагностика | `alphaGammaProfile`, `GammaProfileEditor`; таблицы/окна/сходимость tests + stage 3 Save/reload | Выполнено локальным профилем |
| A09 · с. 43–50 | Ручные рудные интервалы, cut/split/merge/уточнение | `alphaCommands`, `Objects`; unit + stage 3 cut/refine/Undo/Redo/reload | Выполнено |
| A10 · с. 43–66 | Ra/U/m/mRa/mc, три кондиции, ЛФТ и запасы | `GammaSummary`, `alphaGammaReports`; численные tests, четыре CSV в stage 3 QA | Выполнено локальным профилем |
| A11 · с. 49–52 | Предлагаемый фильтр отдельно от ТК; фиксированная длина | `proposeFilter`, dragBoundary; unit + stage 3 proposal drag, actual preserved | Выполнено; спорное определение охвата описано |
| A12 · с. 51–52 | ЗАДР с отступами, границами скважины/водоупорами, выбором кондиций | `alphaGammaReports`; tests + сводки/CSV stage 3 | Выполнено локальным профилем |
| A13 · с. 67–84 | ЭК: детальная/обзорная, зонд, процентные/абсолютные уровни | `alphaElectro`, `calculateElectro`, guides; tests, stage 2 ЭК и final release | Выполнено |
| A14 · с. 67–84 | Нормировка, явная Кф-модель, границы ЛФТ 7/12 | `calculateNormalization`, `kfFor`, `filtrationClass`; unit + browser stage 2 normalization | Выполнено локальным профилем |
| A15 · с. 77–84 | Ручная литология/Кф, внешнее окно, палеозой, сосед | `alphaCommands`, `Objects`, comparison; tests + stage 2 split/neighbor/reload | Выполнено |
| A16 · с. 85–89 | Фактические фильтр/отстойник ТК, общий контакт | `calculateCurrent`, objects/guides; unit + stage 2 drag/Escape + final methods Save | Выполнено |
| A17 · с. 90–93 | ИК: кандидаты/ручные метки, глубина/название, проектные гильзы/фильтр | `calculateMetal`, projects/objects; final methods auto4/manual/Undo/Redo; stage 2 drag/Escape | Выполнено локальным профилем |
| A18 · с. 94–114 | ТМ: авто/ручной фон, половина амплитуды, ручные интервалы | `calculateThermal`, `Objects`; численные tests + final methods repeat/Save | Выполнено локальным профилем |
| A19 · с. 94–114 | Непригодная/повторная ТМ и заключение; без оценки качества цемента | `ThermalParameters`, пустой результат с комментарием; final methods + reload | Выполнено |
| A20 · с. 115–123 | КМр проект/факт/дефицит, цель, min/mean | `calculateCaliper`, tracks/objects/guides; unit + final methods target330/deficit/primary rejected | Выполнено |
| A21 · с. 115–123 | Обсыпка: переменный Ø/конструкция, фактический фильтр/ручное окно | `gravelSummary`, параметры; независимые unit-примеры + browser summary | Выполнено локальным профилем |
| A22 · с. 124–131 | РМ: интегральная/дифференциальная, точки, Q и режим | `calculateFlow`, source markers/bar tracks; unit + final methods repeat/Q25 | Выполнено локальным профилем |
| A23 · с. 124–131 | Шаг 0,5/1, литология/секции; согласованность с ТК, gaps | `alphaCommands`, sections, fingerprint; unit + final sections4/step36/lithology/context | Выполнено |
| A24 · с. 132–159 | Производственный ГК: m/mc/парность/unmatched | `alphaControls`, общий GammaProfile; tests + stage 3 controls + final controls | Выполнено локальным профилем |
| A25 · с. 132–159 | Опорный/безрудный ГК/КС, ручные пары, среднее/RMS, допуски | `controlRows`, `ControlRanges`; tests + final controls все типы и КС | Выполнено локальным профилем |
| A26 · с. 160–164 | Шесть операций кривых и ±0,1; source/derivative/provenance | `alphaCurveOperations`, `CurveOperations`; unit + final curves 6ops/rev7/gap/clip/Save; controls QA Undo/Redo | Выполнено |
| A27 · с. 178–182 | Три листа A3, масштаб/легенда/контрольная линейка | `Passport`, `PassportTracks`; final export 3SVG/print, XML A3/50мм и визуальный просмотр | Выполнено; легенда прототипа |
| A28 · с. 178–182 | SVG/JPEG/печать/CSV/полные данные | `export`, `GammaSummary`; JPEG3508×4961, JSON13+1record/metadata/views, CSV/formula escape tests, release export | Выполнено; физический принтер не проверен |
| A29 · UX KAPGEO | Preview/Apply/Save/Undo/Redo, отдельный ввод, ошибка/Cancel | `AlphaWorkbench`, `DiscardChangesDialog`; stages 2/3 + final guards/controls | Выполнено |
| A30 · UX KAPGEO | Источники/параметры/транзитивный stale/версия | fingerprints/`alphaVersion`; unit + derived stale, profile1→2 migration, release ЭК→ГК | Выполнено |
| A31 · UX KAPGEO | URL/reload/Back/Forward/смена объекта/диапазон | search/Page/Workbench; final guards/access/release | Выполнено |
| A32 · роли KAPGEO | Permission + scope + status; просмотр/locked/forbidden/empty | Page/Workbench/repository; unit + final access R1/R2/R13/R3/locked/empty/R7 | Выполнено |
| A33 · хранение KAPGEO | Совместимые defaults, конфликт, corrupt сохранён, Retry | repository; tests + final access raw-preserved/retry, stage 3 old profile migration | Выполнено |
| A34 · границы пользователя | Автономность, сохранение керна/проб, без backend/БГД-связи | отдельные namespaces/fixtures, repo migration tests; release legacy entry и полный набор прежних тестов | Выполнено |
| A35 · QA KAPGEO | Desktop/mobile/клавиатура, типы/тесты/линт/сборка | 81/350 tests, четыре команды, browser 390/390, keyboard/pan/info, production hash | Выполнено |
| A36 · поручение пользователя | Итоговая документация и трассировка источников | этот файл, [отчёт](./implementation-report.md), текущие docs/status/catalog/flows | Выполнено |

## Проверка закрытия цели

Все шесть реализуемых страниц методов дают наблюдаемый результат: выбирают реальные для локального прототипа численные записи, сохраняют параметры/геометрию и результаты, поддерживают отмену и объясняют ограничения. Седьмая страница — согласованный КНД-м placeholder. Контроли, редактор кривых и паспорт доступны отдельными страницами. Предметные действия проверены и численно, и через UI; исходники и старые документы сохраняются.

Неподтверждённые промышленные формулы/нормативы не маскируются под реализованные требования. OQ-ALPHA остаются будущими предметными решениями, а не незаконченной частью согласованного frontend-прототипа. В этой задаче не заявлены интеграции, точность производственной Альфы, двоичный импорт, КНД-м, физическая печать, деплой или новый push.

Финальные команды: typecheck/lint/build exit 0, 350/350 тестов. Полные браузерные подтверждения/имена артефактов и известные предупреждения приведены в отчёте. Матрица сверена с предметной выжимкой, этапами 1–3, текущим кодом и результатами финального QA.
