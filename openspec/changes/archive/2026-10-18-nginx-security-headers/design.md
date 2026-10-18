## Context

Общие `location` лежат в `nginx/site.conf`, который подключается в `server` обоих режимов: `nginx/http.conf` (локально и в CI) и `nginx/https.conf.template` (стенд). У части `location` свой `add_header Cache-Control`. По умолчанию такой `location` не наследует `add_header` из `server`; в HTTPS-режиме это уже решено `add_header_inherit merge` (nginx 1.29.3+, в образе `nginx:1.30-alpine` — 1.30.5).

Страницы: лендинг `/`, `/login` и 404 — статичный HTML со стилями и модулем из `/assets/`; кабинет под `/app/` — React и Ant Design. Кабинет обращается к API и подписывается на SSE на том же адресе. Внешних источников у страниц один — аватары пользователей с `https://avatars.githubusercontent.com`; ссылки на GitHub — обычные `<a>`, форм нет.

## Goals / Non-Goals

**Goals:**

- Заголовки безопасности на каждом ответе в обоих режимах, включая `return`, 404, 5xx и проксируемый `/api/`.
- CSP, которая не ломает лендинг, `/login`, 404 и кабинет и не даёт нарушений в консоли.

**Non-Goals:**

- Nonce для стилей antd — см. ограничения.
- `Permissions-Policy`, `Cross-Origin-*-Policy`, отчёты о нарушениях (`report-to`).
- Заголовки на редиректе HTTP → HTTPS в режиме стенда: это отдельный `server` без страниц, ответ — только `301`.

## Decisions

### Заголовки в `site.conf`, а не в каждом `server`

`site.conf` подключается на уровне `server`, поэтому заголовки в нём — заголовки `server` в обоих режимах, и режимы не разойдутся. `add_header_inherit merge` переезжает туда же: без него в режиме HTTP заголовки потеряли бы как раз HTML-страницы, у которых свой `Cache-Control`. Оставить его и в `https.conf.template` нельзя — nginx не примет повтор директивы. `always` — чтобы заголовки получали и ответы 4xx и 5xx: 404 и ошибки прокси.

### `Referrer-Policy: strict-origin-when-cross-origin`

Чужому сайту уходит только origin, без пути и строки запроса: путь `/app/...` содержит идентификаторы прогонов, `/login` — адрес возврата. `same-origin` или `no-referrer` скрыли бы и сам origin, но он публичен — это адрес стенда.

### CSP

`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`

- `script-src 'self'` без `'unsafe-inline'` и `'unsafe-eval'`: inline-скриптов нет. Zod при построении схем пробует `Function('')` и сам откатывается на разбор без компиляции, но проба оставляет нарушение в консоли; `z.config({ jitless: true })` в модуле, который `main.tsx` импортирует первым, убирает пробу.
- `style-src 'unsafe-inline'`: antd на CSS-in-JS вставляет `<style>` в рантайме. Без него браузер блокирует стили кабинета (проверено: десятки нарушений, кабинет без оформления).
- `img-src data:` — встроенные картинки antd; аватары — с `avatars.githubusercontent.com`.
- `connect-src 'self'` покрывает `fetch` к API и `EventSource` потока SSE: оба идут на тот же адрес.
- `form-action 'self'`: форм нет; вход через GitHub — ссылка `<a>`, переход по ней и редиректы OAuth директиву не затрагивают.
- `object-src 'none'`, `base-uri 'self'` — запрет плагинов и подмены `<base>`, через которую относительные `/assets/...` ушли бы на чужой адрес.

### Без `X-Frame-Options`

Встраивание запрещает `frame-ancestors 'none'`. Браузеры с CSP 2 при наличии `frame-ancestors` игнорируют `X-Frame-Options`, а браузеров без CSP 2 среди поддерживаемых нет. Второй заголовок с тем же смыслом — второе место для правки без пользы.

## Risks / Trade-offs

- `'unsafe-inline'` в `style-src` оставляет возможность внедрить стили, если найдётся HTML-инъекция. Скрипты при этом не исполнятся. Убрать его можно nonce: antd принимает его через `ConfigProvider csp={{ nonce }}`, но nonce должен быть свой на каждый ответ — nginx подставлял бы его в HTML (`sub_filter` и переменная запроса) и в заголовок. Это отдельная задача.
- Новый внешний источник (шрифт, картинка, аналитика) без правки CSP будет заблокирован браузером. Проверка маршрутов сверяет ключевые директивы, а не всю строку, поэтому расширение списка источников её не ломает.
- Если бэкенд начнёт сам ставить те же заголовки, ответы `/api/` получат их дважды: `add_header` не заменяет заголовки ответа прокси. Для CSP два заголовка — пересечение политик, для остальных — дубль без вреда.
