# DMC-268 UI (команда 1)

Фронтенд на Vite + React + TypeScript для DMC-268, команда 1.

## Запуск

```bash
npm install
npm run dev
```

## Проверки качества

```bash
npm run typecheck
npm run lint
npm run test
```

Деплой UI на хост с Docker — Terraform в каталоге `infra/` (nginx отдаёт сборку Vite). PostgreSQL, RabbitMQ и Redis в этом репозитории нет; они живут в `dmc-268-api-t1`.
