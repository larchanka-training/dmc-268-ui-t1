# Логика infra/*.tf и проверки переменных без Docker и без сервера:
# mock-провайдер не ходит к демону, вычисляемые атрибуты заполняет сам.
# data "docker_network" под ним тоже не ищет сеть, а отдаёт заданное имя —
# поэтому отказ на чистом сервере здесь не проверить, его проверяет деплой.
# Запуск: `cd infra && tofu init -backend=false && tofu test`.

mock_provider "docker" {}

variables {
  ui_image = "ghcr.io/larchanka-training/dmc-268-ui-t1@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
}

run "tls_publishes_443_tcp_and_udp" {
  command = plan

  variables {
    public_tls   = true
    ui_port      = 80
    bind_ip      = "0.0.0.0"
    service_host = "62.169.24.237"
  }

  assert {
    condition = [for p in docker_container.ui.ports : "${p.ip}:${p.external}->${p.internal}/${p.protocol}"] == [
      "0.0.0.0:80->80/tcp",
      "0.0.0.0:443->443/tcp",
      "0.0.0.0:443->443/udp",
    ]
    error_message = "При public_tls публикуются 80/tcp, 443/tcp и 443/udp (HTTP/3) на bind_ip."
  }

  assert {
    condition     = contains(docker_container.ui.env, "PUBLIC_HOST=62.169.24.237")
    error_message = "При public_tls в контейнер приходит PUBLIC_HOST = service_host: по нему select-site.sh включает HTTPS."
  }

  assert {
    condition     = output.ui_url == "https://62.169.24.237"
    error_message = "При public_tls адрес — https:// на service_host, без порта."
  }
}

run "http_without_tls" {
  command = plan

  assert {
    condition = [for p in docker_container.ui.ports : "${p.ip}:${p.external}->${p.internal}/${p.protocol}"] == [
      "127.0.0.1:8080->80/tcp",
    ]
    error_message = "Без TLS публикуется только HTTP-порт, 443 нет."
  }

  assert {
    condition     = length([for e in docker_container.ui.env : e if startswith(e, "PUBLIC_HOST=")]) == 0
    error_message = "Без TLS PUBLIC_HOST не передаётся: иначе nginx пойдёт к ACME-серверу."
  }

  assert {
    condition     = output.ui_url == "http://127.0.0.1:8080"
    error_message = "Без TLS адрес — http:// с нестандартным портом."
  }
}

run "http_on_port_80_omits_port" {
  command = plan

  variables {
    ui_port        = 80
    acme_directory = "https://acme-staging-v02.api.letsencrypt.org/directory"
  }

  assert {
    condition     = output.ui_url == "http://127.0.0.1"
    error_message = "Стандартный порт в адресе опускается."
  }

  assert {
    condition     = contains(docker_container.ui.env, "ACME_DIRECTORY=https://acme-staging-v02.api.letsencrypt.org/directory")
    error_message = "Непустой acme_directory доходит до контейнера."
  }
}

run "container_joins_only_backend_network" {
  command = plan

  assert {
    condition     = [for n in docker_container.ui.networks_advanced : n.name] == ["dmc268"]
    error_message = "Контейнер подключён ровно к сети dmc268 стека бэкенда: по ней nginx находит dmc268-api."
  }

  assert {
    condition     = [for v in docker_container.ui.volumes : v.container_path] == ["/var/lib/nginx-acme"]
    error_message = "Сертификаты лежат на томе, иначе каждый деплой выпускает их заново."
  }
}

# Контейнер ссылается на образ по digest без тега и без ресурса docker_image:
# замена docker_image.ui шла между удалением старого контейнера и созданием
# нового, и pull из ghcr попадал в простой публичного входа (#89). Атрибут
# image провайдер сравнивает строкой, поэтому тег (commit sha, новый на каждом
# коммите) пересоздавал бы контейнер даже при том же digest.
run "ui_runs_image_by_digest_without_tag" {
  command = plan

  variables {
    ui_image = "ghcr.io/larchanka-training/dmc-268-ui-t1:0123abc-api@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
  }

  assert {
    condition     = docker_container.ui.image == "ghcr.io/larchanka-training/dmc-268-ui-t1@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
    error_message = "Контейнер запускается из ui_image по digest, без тега: <репозиторий>@sha256:<digest>."
  }
}

# Двоеточие порта реестра — не тег: срезается только тег после последнего «/».
run "registry_port_is_not_a_tag" {
  command = plan

  variables {
    ui_image = "localhost:5000/dmc-268-ui-t1:0123abc-api@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
  }

  assert {
    condition     = docker_container.ui.image == "localhost:5000/dmc-268-ui-t1@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
    error_message = "Из localhost:5000/<образ>:<тег>@sha256:<digest> срезается только тег, порт реестра остаётся."
  }
}

# Без destroy_grace_seconds провайдер останавливает контейнер с таймаутом 0:
# SIGKILL сразу за SIGQUIT, nginx не успевает ни закрыть соединения, ни
# дописать файлы ACME на томе (#89).
run "ui_stops_gracefully" {
  command = plan

  assert {
    condition     = docker_container.ui.stop_signal == "SIGQUIT"
    error_message = "nginx останавливается сигналом SIGQUIT — graceful shutdown, а не быстрый выход по SIGTERM."
  }

  assert {
    condition     = docker_container.ui.destroy_grace_seconds == 10
    error_message = "destroy_grace_seconds интерфейса — 10 с: nginx закрывает соединения за worker_shutdown_timeout 1 с, остаток — запас до SIGKILL."
  }
}

run "image_without_digest_rejected" {
  command = plan

  variables {
    ui_image = "ghcr.io/larchanka-training/dmc-268-ui-t1:0123abc-api"
  }

  expect_failures = [var.ui_image]
}

run "bind_all_as_service_host_rejected" {
  command = plan

  variables {
    service_host = "0.0.0.0"
  }

  expect_failures = [var.service_host]
}

run "empty_service_host_rejected" {
  command = plan

  variables {
    service_host = ""
  }

  expect_failures = [var.service_host]
}

run "tls_on_non_80_port_rejected" {
  command = plan

  variables {
    public_tls = true
    ui_port    = 8080
  }

  expect_failures = [var.public_tls]
}
