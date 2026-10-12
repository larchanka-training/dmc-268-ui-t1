data "docker_network" "dmc268" {
  name = "dmc268"
}

resource "docker_image" "ui" {
  # Образ собирается и публикуется в CI, здесь он только забирается по тегу.
  # Раньше он собирался прямо отсюда по хешу исходников; при удалённом
  # docker_host такая сборка ушла бы на сервер — без контекста и без кеша.
  name         = var.ui_image
  keep_locally = true
}

# Ключ ACME-аккаунта и выпущенные сертификаты. Отдельный том, а не слой
# контейнера: контейнер пересоздаётся на каждом деплое, и без тома каждый
# деплой выпускал бы сертификат заново, упираясь в лимиты Let's Encrypt.
resource "docker_volume" "acme" {
  name = "dmc268-ui-acme"
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
  # HTTPS, поэтому снаружи он должен быть именно 80.
  ports {
    internal = 80
    external = var.ui_port
    ip       = var.bind_ip
  }

  dynamic "ports" {
    for_each = var.public_tls ? [443] : []
    content {
      internal = 443
      external = 443
      ip       = var.bind_ip
    }
  }
}
