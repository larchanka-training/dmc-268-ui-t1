## Why

nginx интерфейса не отдаёт заголовков безопасности ни в режиме HTTP, ни в режиме HTTPS (#33). Любую страницу, включая статичную `/login` (#25), можно встроить во фрейм чужого сайта и подложить под неё кнопки. Браузер угадывает тип ответа по содержимому, а в `Referer` к чужим сайтам уходит полный путь — с идентификаторами прогонов и адресом возврата после входа.

Политику содержимого можно ввести сейчас без переделок: inline-скриптов нет ни на одной странице, все скрипты — модули из `/assets/`, внешний источник один — аватары с `avatars.githubusercontent.com`.

## What Changes

- Каждый ответ nginx в обоих режимах — страницы, статика, редиректы, 404 и ответы `/api/` — несёт `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` и `Content-Security-Policy`.
- CSP: скрипты и запросы только к своему адресу, стили — свои и inline (antd), картинки — свои, `data:` и аватары GitHub, запрет фреймов (`frame-ancestors 'none'`), плагинов, подмены `<base>` и отправки форм на чужие адреса.
- Заголовки и `add_header_inherit merge` заданы в общем `nginx/site.conf` на уровне `server`; `merge` переезжает туда из `nginx/https.conf.template`.
- Кабинет включает у zod режим `jitless`: иначе zod проверяет `Function` и оставляет в консоли нарушение CSP.
- `scripts/check-routes.sh` проверяет заголовки на `/`, `/login`, `/app/`, на редиректе гостя и на 404 — в CI (job `nginx`) и после деплоя.

## Capabilities

### New Capabilities

### Modified Capabilities

- `frontend-delivery`: ответы интерфейса несут заголовки безопасности и политику содержимого.

## Impact

- Файлы: `nginx/site.conf`, `nginx/https.conf.template`, `scripts/check-routes.sh`, `src/main.tsx`, `src/shared/config/zod.ts`.
- Новый внешний источник для страниц (шрифт, картинка, скрипт аналитики) теперь требует правки CSP в `nginx/site.conf`, иначе браузер его заблокирует.
- Ответы API получают те же заголовки через прокси; бэкенд их сам не ставит, дублей нет.
