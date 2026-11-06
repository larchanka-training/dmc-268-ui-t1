## ADDED Requirements

### Requirement: Публичный вход проксирует Grafana стенда

Интерфейс SHALL отдавать Grafana стенда через свой публичный вход на отдельном порту `8443` — отдельном от кабинета origin с тем же адресом и сертификатом: на общем origin XSS в Grafana читал бы API кабинета с сессией пользователя. Запросы под `/grafana/` на этом порту SHALL уходить в Grafana стенда внутри серверного сетевого окружения с префиксом `/grafana/` в пути: Grafana отдаёт себя из подпути сама. Без Grafana интерфейс SHALL запускаться и работать.

#### Scenario: Открытие Grafana

- **WHEN** браузер открывает `https://<стенд>:8443/grafana/login`
- **THEN** Grafana получает запрос на `/grafana/login` и отдаёт страницу входа, а её статика под `/grafana/public/` загружается

#### Scenario: Grafana нет

- **WHEN** контейнера Grafana нет
- **THEN** `/grafana/` отвечает 502, остальные маршруты кабинета работают

#### Scenario: Grafana не отвечает

- **WHEN** контейнер Grafana есть, но не отвечает на запрос
- **THEN** по истечении тайм-аута прокси `/grafana/` отвечает 504, остальные маршруты кабинета работают

### Requirement: Адреса Grafana перенаправляются с сохранением параметров

Запросы `/grafana` и под `/grafana/` на origin кабинета SHALL перенаправляться на origin Grafana с сохранением пути и параметров. На origin Grafana `/grafana` SHALL перенаправляться на `/grafana/` с сохранением параметров запроса.

#### Scenario: Старый адрес на кабинете

- **WHEN** браузер открывает на origin кабинета `/grafana` или путь под `/grafana/`, например `/grafana/d/abc?orgId=1`
- **THEN** ответ — `301` на тот же путь с теми же параметрами на origin Grafana, `https://<стенд>:8443/grafana/d/abc?orgId=1`

#### Scenario: Адрес без слеша

- **WHEN** браузер открывает на origin Grafana `/grafana?orgId=1`
- **THEN** ответ — `301` на `/grafana/?orgId=1`

### Requirement: Grafana получает сведения о запросе и WebSocket

Grafana SHALL получать адрес стенда из запроса, адрес клиента и схему. Переход на WebSocket SHALL проходить.

#### Scenario: Grafana Live

- **WHEN** браузер открывает WebSocket на `/grafana/api/live/ws`
- **THEN** соединение переходит на WebSocket с Grafana

### Requirement: Вход в Grafana — по личной учётной записи

Доступ к Grafana под `/grafana/` SHALL решать сама Grafana по личной учётной записи: cookie сессии кабинета для `/grafana/` SHALL NOT проверяться. Cookie сессии кабинета `session` SHALL NOT доходить до Grafana: браузер прикладывает её и на порт Grafana, потому что cookie портом не разделяются; остальные cookie, в том числе `grafana_session`, SHALL проходить.

#### Scenario: Гость кабинета открывает Grafana

- **WHEN** клиент без cookie сессии кабинета открывает `/grafana/login`
- **THEN** он получает страницу входа Grafana, а не редирект на `/login` кабинета

#### Scenario: Сессия кабинета не уходит в Grafana

- **WHEN** браузер с cookie `session` кабинета и `grafana_session` открывает `/grafana/`
- **THEN** Grafana получает `grafana_session` и остальные cookie, но не `session`

### Requirement: Частота входа в Grafana ограничена

Частота попыток входа `POST /grafana/login` и `POST /grafana/login/` с одного адреса SHALL быть ограничена; открытие страницы входа (`GET`) в лимит SHALL NOT засчитываться.

#### Scenario: Перебор пароля

- **WHEN** попытки входа `POST /grafana/login` или `POST /grafana/login/` с одного адреса превышают лимит частоты
- **THEN** ответ 429, Grafana запроса не получает

### Requirement: Ответы Grafana несут свои заголовки безопасности

Ответы origin Grafana SHALL содержать `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` и `Content-Security-Policy`, запрещающую встраивание во фрейм, а по HTTPS — ещё `Strict-Transport-Security`. Политика содержимого кабинета на них SHALL NOT распространяться: под ней Grafana не работает.

#### Scenario: Заголовки ответа Grafana

- **WHEN** приходит ответ origin Grafana, в том числе 502 или 504
- **THEN** в нём `X-Content-Type-Options`, `Referrer-Policy` и `Content-Security-Policy` с `frame-ancestors 'none'`, но без `script-src` кабинета

#### Scenario: Ответ Grafana по HTTPS

- **WHEN** ответ origin Grafana идёт по HTTPS
- **THEN** в нём есть `Strict-Transport-Security` с `max-age`
