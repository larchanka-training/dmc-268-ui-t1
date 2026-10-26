# Образ собирается и публикуется в CI, контейнер ссылается на него по digest.
# Ресурса docker_image нет: его замена на каждом коммите шла между удалением
# старого dmc268-ui и созданием нового, и pull из ghcr попадал в простой
# публичного входа (#89). Скачивает образ шаг деплоя до apply, и провайдер
# создаёт контейнер из готового: сам он тянет образ, только если того нет на
# сервере.
#
# В ui_image деплой передаёт `имя:тег@digest` — тег для лога и summary, — а
# контейнер получает ссылку без тега: image сравнивается строкой, и тег
# (commit sha, новый на каждом коммите) пересоздавал бы контейнер даже при том
# же digest.
locals {
  ui_image_ref = join("@", regex("^(.+?)(?::[\\w][\\w.-]{0,127})?@(sha256:[0-9a-f]{64})$", var.ui_image))
}

# Ресурс образа жил в стеке до #89. Из состояния он уходит без уничтожения:
# keep_locally у него и так не снимал образ с сервера.
removed {
  from = docker_image.ui

  lifecycle {
    destroy = false
  }
}

# Ключ ACME-аккаунта и выпущенные сертификаты. Отдельный том, а не слой
# контейнера: контейнер пересоздаётся на каждом деплое, и без тома каждый
# деплой выпускал бы сертификат заново, упираясь в лимиты Let's Encrypt.
#
# prevent_destroy: план, уничтожающий или заменяющий том, OpenTofu отклоняет
# сам — и в деплое, и в ручных `tofu apply` и `tofu destroy`. Мимо него проходит
# только удаление блока из конфигурации: lifecycle уходит вместе с ним. Это
# ловит сторож .github/scripts/deploy/plan.sh — по адресу и по имени тома.
# Сменить том — новым ресурсом, а этот снять с учёта блоком
# `removed { lifecycle { destroy = false } }`: сертификаты останутся на сервере.
resource "docker_volume" "acme" {
  name = "dmc268-ui-acme"

  lifecycle {
    prevent_destroy = true
  }
}

resource "docker_container" "ui" {
  name    = "dmc268-ui"
  image   = local.ui_image_ref
  restart = "unless-stopped"

  # Без destroy_grace_seconds провайдер останавливает контейнер с таймаутом 0 —
  # SIGKILL сразу за сигналом остановки: рвутся запросы и запись файлов ACME на
  # томе. SIGQUIT — graceful shutdown nginx (тот же сигнал у базового образа,
  # здесь — явно). Поток SSE живёт часами, его nginx обрывает сам через
  # worker_shutdown_timeout 1 с (Dockerfile); 10 с — запас до SIGKILL.
  stop_signal           = "SIGQUIT"
  destroy_grace_seconds = 10

  # Пустой PUBLIC_HOST — режим HTTP без обращения к ACME-серверу (см.
  # nginx/select-site.sh). acme_directory пустой — боевой Let's Encrypt.
  env = compact([
    var.public_tls ? "PUBLIC_HOST=${var.service_host}" : "",
    var.acme_directory != "" ? "ACME_DIRECTORY=${var.acme_directory}" : "",
  ])

  networks_advanced {
    name = data.docker_network.dmc268.name
  }

  volumes {
    volume_name    = docker_volume.acme.name
    container_path = "/var/lib/nginx-acme"
  }

  # В режиме TLS этот порт обслуживает проверку HTTP-01 и перенаправляет на
  # HTTPS, поэтому снаружи он должен быть именно 80. protocol указан явно,
  # хотя tcp — значение по умолчанию: mock-провайдер в tofu test умолчаний
  # провайдера не подставляет.
  ports {
    internal = 80
    external = var.ui_port
    ip       = var.bind_ip
    protocol = "tcp"
  }

  # 443 по TCP — HTTP/2, по UDP — HTTP/3 (QUIC). Порядок tcp, udp тот же, что
  # был у двух отдельных блоков: ports — список, и перестановка дала бы diff.
  dynamic "ports" {
    for_each = var.public_tls ? ["tcp", "udp"] : []
    content {
      internal = 443
      external = 443
      ip       = var.bind_ip
      protocol = ports.value
    }
  }
}
