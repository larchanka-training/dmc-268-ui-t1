# Сеть создаёт стек бэкенда (dmc-268-api-t1), здесь она только ищется. На
# чистом сервере поиск падает на plan — до изменений на сервере, как требует
# спека frontend-delivery.
data "docker_network" "dmc268" {
  name = "dmc268"
}

# Сеть приёма трейсов браузера: в ней nginx находит коллектор dmc268-otelcol
# (location = /otlp/v1/traces). Создаёт её стек бэкенда, и без флага стека
# наблюдаемости тоже, поэтому поиск не падает и на стенде без коллектора.
data "docker_network" "otlp" {
  name = "dmc268-otlp"
}

# Сеть публичного входа в Grafana: в ней nginx находит dmc268-grafana
# (location /grafana/ в nginx/site.conf). Создаёт её стек бэкенда, как и
# dmc268-otlp; без неё поиск падает на plan — до изменений на сервере.
data "docker_network" "grafana_proxy" {
  name = "dmc268-grafana-proxy"
}
