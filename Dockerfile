FROM node:24-alpine AS build
# Не /app: Vite 8 собирает html-входы по пути относительно корня, и корень
# /app сливает лендинг с app/index.html (в dist пропадает index.html).
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Абсолютный адрес стенда для canonical, Open Graph, sitemap.xml и robots.txt.
# Без аргумента Vite берёт http://localhost:3000.
ARG PUBLIC_ORIGIN
ENV PUBLIC_ORIGIN=$PUBLIC_ORIGIN
# Источник данных кабинета: без аргумента — mock adapter, `false` — бэкенд.
# Флаг печатается в бандл, поэтому меняется только пересборкой.
ARG VITE_USE_MOCK_API
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API
# Телеметрия кабинета (change cabinet-browser-telemetry): без адреса коллектора
# экспорт выключен. Версия — sha коммита, окружение — deployment.environment.name.
ARG VITE_OTEL_EXPORTER_URL
ENV VITE_OTEL_EXPORTER_URL=$VITE_OTEL_EXPORTER_URL
ARG VITE_OTEL_ENVIRONMENT
ENV VITE_OTEL_ENVIRONMENT=$VITE_OTEL_ENVIRONMENT
ARG VITE_APP_VERSION
ENV VITE_APP_VERSION=$VITE_APP_VERSION
# Готовые .gz рядом с файлами — их отдаёт gzip_static в nginx/site.conf.
RUN pnpm run build \
    && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.xml' -o -name '*.txt' \) \
       -exec gzip -9 -k {} +

FROM nginx:1.30-alpine
# apk upgrade: пакеты ОС — с исправлениями из репозитория Alpine на момент
# сборки, а не на момент выхода базового образа: он пересобирается реже, и
# trivy (job image в CI, скан перед деплоем) находил бы CVE, исправленную в
# Alpine, но ещё не попавшую в nginx:1.30-alpine (brotli-libs, CVE-2026-111497).
# Модуль ACME лежит в образе, но не подключён: load_module допустим только
# в главном конфиге, а не в conf.d.
RUN apk upgrade --no-cache \
    && sed -i '1i load_module modules/ngx_http_acme_module.so;' /etc/nginx/nginx.conf \
    && mkdir -p /var/lib/nginx-acme
COPY nginx/site.conf nginx/http.conf nginx/https.conf.template /etc/nginx/
COPY --chmod=755 nginx/select-site.sh /docker-entrypoint.d/40-select-site.sh
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80 443 443/udp
