# Product Design / UX / UI среда Codex

Настроено и проверено 12.10.2026. Область установки — этот репозиторий, без глобальных правил или зависимостей приложения.

## Работа в проекте

Главный файл — [AGENTS.md](../../AGENTS.md). Он сохраняет начальное чтение docs, архивную политику, source of truth, архитектуру и change discipline. Разделы A–M задают роли Product/UX/UI/Analysis/React/QA, приоритеты от целей пользователя до поддерживаемости кода, границы mock-прототипа, reasoning, навигацию и контекст, дизайн-систему, различение требований/гипотез, skill routing, рабочий процесс, реальные команды и краткую коммуникацию по-русски.

Навыки находятся в `.agents/skills/<name>/SKILL.md`. Это repo scope Codex: навыки доступны также при работе из вложенной папки. Каждый навык установлен обычной папкой; symlink/junction не используются. Собственные навыки имеют `agents/openai.yaml` с разрешённым автоматическим выбором. Выбираются только навыки, соответствующие текущей задаче.

Codex обнаруживает изменения skills автоматически. Они должны стать доступны на следующем ходе; если список не обновился, открой новую сессию или перезапусти Codex. Фактическая загрузка в будущую сессию отдельно от проверки файлов не заявляется. Правила обнаружения: [официальная документация OpenAI](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills).

## Установленный набор

Все пути в таблице находятся внутри `.agents/skills/` и совпадают с именем навыка.

| Источник | Установленные skills |
|---|---|
| [uxcel-lab/product-skills](https://github.com/uxcel-lab/product-skills/tree/5007cd0241ccaa51ae2e4681f9618912dc10e239) | `ux-navigation`, `ux-information-architecture-audit`, `pm-product-spec`, `ux-dashboard`, `ux-tables`, `ux-heuristics-audit` |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) / npm `ui-ux-pro-max-cli@2.15.0` | `ui-ux-pro-max`, включая локальные CSV и Python scripts |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278) | `web-design-guidelines`, `vercel-composition-patterns`, `vercel-react-best-practices` |
| [anthropics/skills](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) | `frontend-design` |
| [aditya-ariosity/ux-ui-skills](https://github.com/aditya-ariosity/ux-ui-skills/tree/74308ad0beac6d880d87aaf5660b5eaf3bd8afdd/handoff-to-dev) | `handoff-to-dev` со всеми references |
| [openai/skills](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/playwright) | официальный `playwright` с исходной Bash-обёрткой, references, assets и дополнительной Windows-обёрткой |
| [obra/superpowers](https://github.com/obra/superpowers/tree/bb92a77741419a4ab5f06e711a283343f1ada0c3/skills/verification-before-completion) | `verification-before-completion` |
| Локальный KAPGEO | [product-prototype-designer](../../.agents/skills/product-prototype-designer/SKILL.md), [prototype-flow-qa](../../.agents/skills/prototype-flow-qa/SKILL.md) |

Итого: **14 сторонних + 2 собственных = 16 skills**. Все 13 обязательных сторонних навыков установлены.

`vercel-react-best-practices` добавлен для client-side производительности сложных таблиц, Query и Canvas. Next.js/RSC/server-разделы не применяются к Vite SPA. `pm-personas-jtbd` сейчас не установлен: проект уже содержит роли и задачи, отдельное исследование аудитории не запрошено. `dashboard-redesign` не установлен: текущая аналитика — заглушка, задачи проектирования сводок покрывает `ux-dashboard`.

## Происхождение и установка

Перед установкой проверены исходные репозитории, названия в YAML, каталог CLI, manifest пакетов и существенные операции установщиков. Никакие скачанные scripts не выполнялись автоматически по указанию SKILL.md. Приложение не получает новых npm-зависимостей.

- CLI `skills@1.7.2`: `--agent codex --skill <выбранные имена> --copy -y`; GitHub-источники закреплены commit SHA. Телеметрия отключена через `DISABLE_TELEMETRY`/`DO_NOT_TRACK`; npm lifecycle scripts отключены через `--ignore-scripts`. Каталог Uxcel проверен через `--list` (его нельзя совместить с `--json` в этой версии).
- UI/UX Pro Max: скачан актуальный npm-пакет `ui-ux-pro-max-cli@2.15.0`, проверен `dist/index.js`, затем официальный `init --ai codex` выполнен в `.tmp/design-environment/uipro-stage/`. У опубликованного CLI нет `--dry-run`, хотя более новый README его упоминает. Перенесён только `ui-ux-pro-max`; шесть дополнительных sibling skills остались в игнорируемом staging. Устаревший `uipro-cli` не использован. Имя исполняемой команды актуального пакета — `uipro`.
- Playwright: официальный `skill-installer` использован с `--repo openai/skills --path skills/.curated/playwright --ref <SHA> --dest <repo>/.agents/skills --method download`.
- Собственные skills: созданы официальным initializer `skill-creator`, затем написаны проектные процедуры, условия применения и YAML-метаданные. Первый объединяет анализ и реализацию vertical slice; второй проверяет потоки, контекст, действия, состояния и согласованность данных с приоритетами дефектов.

[skills-lock.json](../../skills-lock.json) содержит 12 записей CLI `skills`. Полный состав всех 16, ревизии/версии, локальная адаптация Playwright и SHA-256 каждого файла находятся в [.agents/skills-manifest.json](../../.agents/skills-manifest.json). Это контроль установленного снимка, а не автообновление. После намеренного изменения skill нужно пересмотреть источник/процедуру и обновить соответствующие hashes. Лицензии, опубликованные в корне источников, сохранены в `.agents/licenses/`; `frontend-design/LICENSE.txt` сохранён в самом навыке. Не придумываются отсутствующие upstream-файлы лицензий.

## Playwright в Windows

Официальный skill ориентирован на Bash и глобальный пример пути. Его исходники сохранены; дополнительно создана [playwright_cli.ps1](../../.agents/skills/playwright/scripts/playwright_cli.ps1), использующая `npx --yes --ignore-scripts --package @playwright/cli@0.1.22 playwright-cli`. Эта версия пакета получена из официального Microsoft Playwright CLI. Обёртка не меняет `HOME`, `CODEX_HOME`, глобальный npm или зависимости React; временный npm-кэш по умолчанию находится в `.tmp/design-environment/npm-cache/`.

Стандартная [.playwright/cli.config.json](../../.playwright/cli.config.json) включает отдельный browser context и сохранение артефактов в `.tmp/design-qa/`. User profile не используется. Открой Vite из корня и выполняй команды:

```powershell
npm run dev
# В другом терминале:
& ./.agents/skills/playwright/scripts/playwright_cli.ps1 --help
& ./.agents/skills/playwright/scripts/playwright_cli.ps1 -s=kapgeo-qa open http://127.0.0.1:4173
& ./.agents/skills/playwright/scripts/playwright_cli.ps1 -s=kapgeo-qa snapshot
# Используй refs из свежего snapshot для click/fill.
& ./.agents/skills/playwright/scripts/playwright_cli.ps1 -s=kapgeo-qa console error
& ./.agents/skills/playwright/scripts/playwright_cli.ps1 -s=kapgeo-qa close
```

На первом запуске npx может потребоваться сеть для получения CLI. В проверенном окружении браузер уже доступен; новый браузер и `@playwright/test` в основной проект не устанавливались. Если dev-server в sandbox недоступен внешнему browser-процессу, запускай его в согласованной разрешённой среде; не меняй firewall и системные настройки. В этой проверке sandbox-сервер был остановлен, затем сервер запущен с одобренным доступом.

## Проверка 12.10.2026

- Окружение: Node 24.21.0, npm/npx 11.19.0, Git 2.51.0.windows.2, Python 3.11.9, PyYAML 6.0.3, Codex CLI 0.162.0-alpha.17.2. Глобальная конфигурация не изменялась.
- Все 16 SKILL.md проходят официальный `skill-creator/scripts/quick_validate.py`.
- `python scripts/validate_design_skills.py` проверяет полный инвентарь, YAML/name/description, ссылки, UI-assets, implicit invocation локальных skills, отсутствие symlinks, SHA-256, соответствие lock и наличие разделов AGENTS.md. Требует установленный PyYAML; сетевых операций нет, архив не читает.
- Синтаксис всех 15 установленных Python scripts проверен через `compile`, без выполнения вспомогательных scripts и создания pycache. Локальный поиск UI/UX Pro Max проверен для UX и React; генератор выдаёт результат без `--persist`. Его предложения не применялись к токенам KAPGEO.
- Основное приложение: `npm run typecheck`, `npm run lint`, `npm run build` — exit 0; `npm run test` — **43 файла / 162 теста**, exit 0. Сохранилось известное предупреждение сборки о JS chunk больше 500 kB.
- Реальный Playwright smoke: synthetic-вход → БГД Сарытау → WELL-1010-FULL; screenshots 1440×900 и 390×844 визуально просмотрены, console errors/warnings в этой сессии — 0, ширина документа на mobile — 390 px. Дополнительно проверен запуск со стандартной `.playwright/cli.config.json` без явного `--config`: артефакты попадают в `.tmp/design-qa/`. В новом контексте на странице входа зарегистрированы два 404-запроса `/favicon.ico`; это существующий отсутствующий ресурс приложения, его исправление вне задачи настройки среды. Это проверка инструмента на существующем сценарии, не полный аудит продукта.
- CLI `skills list -a codex --json` обнаруживает все **16** навыков со scope `project` и агентом `Codex`.
- Git diff проверен относительно состояния до установки: исходники приложения, package.json/package-lock, атлас и ранее существовавшие изменения не затронуты. Новые файлы относятся к правилам, skills, проверке и документации; `.gitignore` дополнен только CLI-артефактами. Деплой и commit не выполнялись.

Незавершённых обязательных установок нет. Будущая доступность внешних web-guidelines и npm/GitHub зависит от сети; отсутствие сети следует отражать в отчёте соответствующей задачи.
