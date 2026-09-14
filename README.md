# DMC-268 UI (команда 1)

Фронтенд на Vite + React + TypeScript для DMC-268, команда 1.

## Запуск

```bash
pnpm install
pnpm run dev
```

## Проверки качества

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```

Деплой UI на хост с Docker — Terraform в каталоге `infra/` (nginx отдаёт сборку Vite). PostgreSQL и RabbitMQ в этом репозитории нет; они живут в `dmc-268-api-t1`.
