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
  description = "Host port for the UI HTTP server."
  default     = 8080
}
