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
RUN pnpm run build
# Готовые .gz рядом с файлами — их отдаёт gzip_static в nginx/site.conf.
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.xml' -o -name '*.txt' \) \
    -exec gzip -9 -k {} +

FROM nginx:1.30-alpine
# Модуль ACME лежит в образе, но не подключён: load_module допустим только
# в главном конфиге, а не в conf.d.
RUN sed -i '1i load_module modules/ngx_http_acme_module.so;' /etc/nginx/nginx.conf \
    && mkdir -p /var/lib/nginx-acme
COPY nginx/site.conf nginx/http.conf nginx/https.conf.template /etc/nginx/
COPY --chmod=755 nginx/select-site.sh /docker-entrypoint.d/40-select-site.sh
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80 443 443/udp
