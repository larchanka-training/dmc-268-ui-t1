# Tasks

## 1. Образ

- [x] 1.1 `nginx/status.conf`: server на 8081 с `location = /stub_status`, остальное 404; `COPY` в `conf.d` в `Dockerfile`
- [x] 1.2 CI: шаг маршрутов проверяет `stub_status` изнутри контейнера
- [x] 1.3 Образ собран локально: `nginx -t` в режимах HTTP и HTTPS проходит, `stub_status` отвечает на 8081, по публичному порту `/stub_status` даёт 404, опубликован только порт 80
