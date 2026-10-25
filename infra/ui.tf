# В ui_image деплой передаёт `имя:тег@digest` — тег для лога и summary, — а
# ресурс образа получает ссылку без тега. name сравнивается строкой, и тег
# (commit sha, новый на каждом коммите) заменял бы ресурс образа, а за ним и
# контейнер, даже при том же digest.
locals {
  ui_image_ref = join("@", regex("^(.+?)(?::[\\w][\\w.-]{0,127})?@(sha256:[0-9a-f]{64})$", var.ui_image))
}

resource "docker_image" "ui" {
  # Образ собирается и публикуется в CI, здесь он только забирается по digest.
  # Раньше он собирался прямо отсюда по хешу исходников; при удалённом
  # docker_host такая сборка ушла бы на сервер — без контекста и без кеша.
  name         = local.ui_image_ref
  keep_locally = true
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
  image   = docker_image.ui.image_id
  restart = "unless-stopped"

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
