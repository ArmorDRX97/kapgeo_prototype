# AI KAPGEO

Опубликованное приложение: <https://armordrx97.github.io/kapgeo_prototype/>

Интерактивный React-прототип корпоративной системы для сквозной работы с геологическими, технологическими, модельными и аналитическими данными.

## Начать отсюда

- Главная документация: [docs/README.md](./docs/README.md)
- Текущий статус реализации: [docs/implementation-status.md](./docs/implementation-status.md)
- Полная UI/UX-спецификация: [docs/ui-ux/README.md](./docs/ui-ux/README.md)
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
