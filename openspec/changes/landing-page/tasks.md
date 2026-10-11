## 1. Сборка

- [ ] 1.1 HTML приложения переезжает в `app/index.html`, `index.html` — лендинг; обе страницы и `404.html` во входах `build.rolldownOptions.input`
- [ ] 1.2 Dev-сервер: `appType: 'mpa'` и плагин переписывания `/app/*` на `/app/index.html`; правило — чистая функция с тестом
- [ ] 1.3 Аргумент сборки `PUBLIC_ORIGIN`: подстановка в HTML через `transformIndexHtml`, генерация `sitemap.xml`; по умолчанию `http://localhost:3000`
- [ ] 1.4 `public/robots.txt` и Open Graph-картинка

## 2. Лендинг

- [ ] 2.1 Вёрстка `index.html` на Tailwind, CSS-вход `src/landing/landing.css`: что делает агент, конвейер, скриншоты, стек, команда, ссылки на GitHub, «Войти» → `/app/login`
- [ ] 2.2 Метаданные: `lang="ru"`, `<title>`, `description`, canonical, Open Graph
- [ ] 2.3 Скриншоты Diff Viewer и прогресса прогона с моков, WebP с `width` и `height`
- [ ] 2.4 Статичная `404.html` со ссылками на лендинг и `/app/`

## 3. Доставка

- [ ] 3.1 `nginx/site.conf`: `/app` → `/app/`, `/app/` → `try_files $uri /app/index.html`, остальное — `try_files $uri $uri/ =404` и `error_page 404 /404.html`; `no-cache` для трёх документов
- [ ] 3.2 `Dockerfile` и job сборки образа: `PUBLIC_ORIGIN` из адреса стенда
- [ ] 3.3 Job `nginx` в `ci.yml`: поднять образ и проверить `/`, `/app/`, `/app/reviews/123`, `/nope`, `/app`, заголовки кэша
- [ ] 3.4 `deploy.yml`: бандл для проверки gzip — из `/app/`; проверки маршрутизации на стенде

## 4. Приложение

- [ ] 4.1 `basename="/app"` у роутера кабинета — здесь или в #16, по договорённости с его автором
- [ ] 4.2 Ссылки внутри приложения и редиректы после входа ведут под `/app/`

## 5. Проверка

- [ ] 5.1 Lighthouse лендинга: SEO и Accessibility не ниже 90, результат в описании PR
- [ ] 5.2 Превью ссылки на стенд в Telegram: заголовок, описание, картинка
