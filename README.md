# AI KAPGEO

Опубликованное приложение: <https://armordrx97.github.io/kapgeo_prototype/>

Интерактивный React-прототип базы геологических данных (БГД): реестр месторождений, карточки объектов и рабочие пространства скважин.

## Начать отсюда

- Главная документация: [docs/README.md](./docs/README.md)
- Текущий статус реализации: [docs/implementation-status.md](./docs/implementation-status.md)
- UI/UX-спецификация БГД: [docs/ui-ux/README.md](./docs/ui-ux/README.md)
- Правила для AI/Codex-сессий: [AGENTS.md](./AGENTS.md)

## Структура

```text
kapgeo/
├── src/                    # React/TypeScript-приложение
├── docs/                   # основная документация — читать первой
│   └── ui-ux/              # продуктовая и UI/UX-спецификация
├── archive/                # исторические материалы — не сканировать
├── AGENTS.md               # межсессионные правила
└── package.json            # команды проекта
```

## Команды

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

Точные команды и готовность функций фиксируются в [статусе реализации](./docs/implementation-status.md).
