## 1. nginx и контейнер

- [x] 1.1 `nginx/https.conf.template`: `listen 443 quic reuseport`, `http2 on`, `http3 on`, `Alt-Svc`, `add_header_inherit merge`
- [x] 1.2 `infra/main.tf`: публикация `443/udp` при `public_tls`
- [x] 1.3 `Dockerfile`: `EXPOSE 443/udp`
- [x] 1.4 `infra/README.md`: HTTP/2 по TCP, HTTP/3 по UDP, открыть оба порта
- [x] 1.5 `Dockerfile`: `gzip -9 -k` статики после сборки; `nginx/site.conf`: `gzip_static`, `gzip` для API без `text/event-stream`, `gzip_vary`
- [x] 1.6 `nginx/https.conf.template`: `Strict-Transport-Security: max-age=86400`; `deploy.yml`: проверка заголовка

## 2. Проверка

- [x] 2.1 Локальный стенд: h2, h3, `Alt-Svc` в `location` со своим `add_header`, SSE, откат при закрытом UDP
- [x] 2.2 Образ интерфейса с итоговым шаблоном: `nginx -t`
- [x] 2.3 Сжатие на настоящем образе: статика, API, SSE без сжатия, кэш-заголовки — по HTTP/1.1, HTTP/2, HTTP/3
- [x] 2.4 Pebble: выпуск и продление сертификата модулем ACME, отдача по HTTP/2 и HTTP/3 без перезапуска
- [x] 2.5 UDP-проба до VPS: ICMP port unreachable, провайдер UDP не режет
- [x] 2.6 `deploy.yml`: шаг проверки HTTP/2, `Alt-Svc` и HTTP/3
- [x] 2.7 Первый деплой: шаг HTTP/3 зелёный, в браузере на стенде Protocol `h3` — проверено: деплой [40082897966](https://github.com/larchanka-training/dmc-268-ui-t1/actions/runs/40082897966), шаг «Проверить HTTP/2 и HTTP/3» success: `alt-svc: h3=":443"; ma=86400`, «по QUIC отдаётся HTTP/3» (curl `--http3-only`); колонка Protocol в браузере не смотрелась — curl по QUIC даёт то же
- [x] 2.8 CI: `nginx -t` на собранном образе в режимах HTTP и HTTPS
