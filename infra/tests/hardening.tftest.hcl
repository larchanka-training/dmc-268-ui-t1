# Ограничения контейнера интерфейса (#79): без Docker, на mock-провайдере, как
# main.tftest.hcl. Что nginx с ними стартует и выпускает сертификат, проверено
# прогоном образа (infra/ui.tf) — здесь только то, что они не потерялись.

mock_provider "docker" {}

variables {
  ui_image = "ghcr.io/larchanka-training/dmc-268-ui-t1@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f"
}

run "ui_cannot_gain_privileges" {
  command = plan

  assert {
    condition     = docker_container.ui.security_opts == toset(["no-new-privileges:true"])
    error_message = "Процессы контейнера интерфейса не получают новых привилегий: no-new-privileges."
  }
}

run "ui_keeps_only_capabilities_nginx_needs" {
  command = plan

  assert {
    condition     = one(docker_container.ui.capabilities).drop == toset(["ALL"])
    error_message = "Контейнер интерфейса сбрасывает все capabilities и возвращает только нужные nginx."
  }

  assert {
    condition     = one(docker_container.ui.capabilities).add == toset(["CHOWN", "NET_BIND_SERVICE", "SETGID", "SETUID"])
    error_message = "nginx нужны ровно CHOWN (каталоги temp и том ACME), SETUID и SETGID (воркеры от nginx) и NET_BIND_SERVICE (80 и 443)."
  }
}

run "ui_has_healthcheck_on_stub_status" {
  command = plan

  assert {
    condition     = one(docker_container.ui.healthcheck).test == tolist(["CMD", "wget", "-q", "--spider", "http://127.0.0.1:8081/stub_status"])
    error_message = "Healthcheck интерфейса опрашивает stub_status на 8081: он есть в обоих режимах и не зависит от бэкенда."
  }

  assert {
    condition     = one(docker_container.ui.healthcheck).interval == "30s" && one(docker_container.ui.healthcheck).timeout == "5s" && one(docker_container.ui.healthcheck).retries == 3
    error_message = "Healthcheck раз в 30 с, ответ за 5 с, unhealthy после трёх отказов: так записано в README и спеке."
  }
}
