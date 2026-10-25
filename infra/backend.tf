# Состояние лежит в том же S3-совместимом хранилище, что у бэкенда, но под
# своим ключом: стеки независимы по состоянию и применение одного не меняет
# состояние другого. Хранилище доступно только через SSH-туннель, поэтому
# endpoint смотрит на localhost — туннель поднимает тот, кто запускает tofu.
#
# Проверки региона, учётных данных и метаданных отключены: они про AWS, а у нас
# S3-совместимое хранилище без региона и без сервиса метаданных.
terraform {
  backend "s3" {
    bucket = "dmc268-tfstate"
    key    = "ui/terraform.tfstate"
    region = "us-east-1"

    endpoints = {
      s3 = "http://127.0.0.1:9000"
    }

    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true

    # Блокировка: lock-объект ui/terraform.tfstate.tflock рядом с состоянием,
    # создаётся условной записью. concurrency в deploy.yml очередь прогонов CI
    # держит и так, а ручной apply из README идёт мимо неё. Хранилище то же,
    # что у бэкенда, а он с use_lockfile уже работает.
    use_lockfile = true
  }
}
