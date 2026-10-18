## 1. nginx

- [x] 1.1 `nginx/site.conf`: `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy` с `always` на уровне `server`
- [x] 1.2 `add_header_inherit merge` из `nginx/https.conf.template` в `nginx/site.conf` — для обоих режимов

## 2. Кабинет

- [x] 2.1 `src/shared/config/zod.ts`: `z.config({ jitless: true })`, импорт первым в `src/main.tsx` — без нарушения CSP от пробы `Function`

## 3. Проверка

- [x] 3.1 `scripts/check-routes.sh`: заголовки на `/`, `/login`, `/app/` с cookie, на редиректе гостя с `/app/` и на 404
- [x] 3.2 Образ: `nginx -t` в режимах HTTP и HTTPS, `check-routes.sh` на поднятом контейнере
- [x] 3.3 Headless Chrome: лендинг, `/login`, 404 и кабинет под `/app/` без нарушений CSP; без `'unsafe-inline'` в `style-src` стили antd блокируются
