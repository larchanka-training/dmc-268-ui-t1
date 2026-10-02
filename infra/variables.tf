variable "docker_host" {
  type        = string
  description = "Docker daemon URI. Use unix:///var/run/docker.sock locally or ssh://user@server for a remote host."
  default     = "unix:///var/run/docker.sock"
}

variable "bind_ip" {
  type        = string
  description = "Interface to publish the UI port on."
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
}

variable "ui_image" {
  type        = string
  description = "Полная ссылка на образ интерфейса в реестре, с тегом по commit sha."
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
