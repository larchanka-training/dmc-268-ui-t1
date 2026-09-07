resource "docker_image" "ui" {
  name = "dmc268-ui:local"

  build {
    context    = "${path.module}/.."
    dockerfile = "Dockerfile"
  }
}

resource "docker_container" "ui" {
  name  = "dmc268-ui"
  image = docker_image.ui.image_id

  ports {
    internal = 80
    external = var.ui_port
    ip       = var.bind_ip
  }
}
