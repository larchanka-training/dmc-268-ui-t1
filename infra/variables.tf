variable "docker_host" {
  type        = string
  description = "URI демона Docker: локально unix:///var/run/docker.sock, для удалённого хоста ssh://user@server."
  default     = "unix:///var/run/docker.sock"
}

variable "bind_ip" {
  type        = string
  description = "Интерфейс, на котором публикуются порты интерфейса. Как имя хоста для клиента не используется."
  default     = "127.0.0.1"
}

variable "ui_port" {
  type        = number
  description = "Порт HTTP на хосте. При public_tls — только 80: на нём идёт проверка HTTP-01 и перенаправление на HTTPS."
  default     = 8080
}

variable "service_host" {
  type        = string
  description = "Имя хоста, по которому интерфейс доступен клиенту. Нельзя ставить 0.0.0.0 — это не bind_ip."
  default     = "127.0.0.1"

  # Спека frontend-delivery: адрес привязки не становится именем хоста в
  # ui_url. Пустое значение — незаданный секрет, пришедший в TF_VAR_* пустой
  # строкой: при TLS nginx остался бы без PUBLIC_HOST. Ловим на plan, пока на
  # сервере ничего не изменилось.
  validation {
    condition     = trimspace(var.service_host) != "" && !contains(["0.0.0.0", "::", "[::]"], var.service_host)
    error_message = "service_host должен быть обращаемым именем хоста или адресом: пустая строка и адрес привязки ко всем интерфейсам (0.0.0.0, ::) не подходят."
  }

  # Значение уходит в PUBLIC_HOST nginx и в адреса как есть: server_name,
  # сертификат, редирект, Grafana на :8443. Поэтому только имя хоста в нижнем
  # регистре или IPv4 — без схемы, пути, порта и точки в конце. IPv6 не
  # поддерживается: в адресах его пришлось бы брать в скобки.
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$", var.service_host))
    error_message = "service_host — имя хоста в нижнем регистре или IPv4, без схемы, пути, порта и точки в конце (review.example.org, 62.169.24.237). IPv6 не поддерживается."
  }
}

variable "public_tls" {
  type        = bool
  description = "Отдавать интерфейс по HTTPS с сертификатом Let's Encrypt на service_host. Требует, чтобы service_host был публичным адресом, а ui_port — 80: на нём идёт проверка HTTP-01."
  default     = false

  validation {
    condition     = !var.public_tls || var.ui_port == 80
    error_message = "При public_tls ui_port должен быть 80: Let's Encrypt проверяет владение адресом именно на этом порту."
  }
}

variable "acme_directory" {
  type        = string
  description = "Адрес каталога ACME. Пусто — боевой Let's Encrypt; для пробы — https://acme-staging-v02.api.letsencrypt.org/directory."
  default     = ""

  # Непустой каталог считается тестовым: своё состояние на томе (select-site.sh)
  # и проверки деплоя без сверки цепочки. Боевой адрес здесь включил бы и то и
  # другое для боевого сертификата.
  validation {
    condition     = trimsuffix(var.acme_directory, "/") != "https://acme-v02.api.letsencrypt.org/directory"
    error_message = "acme_directory: для боевого Let's Encrypt оставьте пустым — непустое значение считается тестовым каталогом."
  }
}

variable "ui_image" {
  type        = string
  description = "Ссылка на образ интерфейса в реестре с digest: ghcr.io/…@sha256:<64 hex>. Тег перед digest допустим, но не обязателен."

  # Спека frontend-delivery: развёртывание не зависит от тега. Тег
  # перезаписывается, digest называет ровно собранный образ.
  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.ui_image))
    error_message = "ui_image должен быть ссылкой с digest (…@sha256:<64 hex>): тег перезаписывается, digest называет ровно собранный образ."
  }
}

variable "registry_username" {
  type        = string
  description = "Пользователь реестра образов. В CI — github.actor."
  default     = ""
}

variable "registry_password" {
  type        = string
  description = "Токен реестра образов. В CI — GITHUB_TOKEN, живёт один прогон."
  default     = ""
  sensitive   = true
}
