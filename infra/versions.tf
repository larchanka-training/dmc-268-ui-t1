terraform {
  # Пол, а не пин: CI ставит OpenTofu 1.12.6, его и проверяем. Занижать
  # смысла нет — пол ниже проверяемого обещает работоспособность, которую
  # никто не подтверждал.
  required_version = ">= 1.12.0"

  required_providers {
    docker = {
      # Точная версия закреплена в .terraform.lock.hcl; команда его пересборки
      # описана в README.md.
      source  = "kreuzwerker/docker"
      version = "~> 4.6"
    }
  }
}

provider "docker" {
  host = var.docker_host

  # Образ интерфейса лежит в приватном пакете репозитория. Учётные данные
  # живут один прогон, поэтому на сервере не нужно ни `docker login`, ни
  # долгоживущий токен.
  registry_auth {
    address  = "ghcr.io"
    username = var.registry_username
    password = var.registry_password
  }
}
