data "docker_network" "dmc268" {
  name = "dmc268"
}

locals {
  ui_source_hash = sha256(join("", [
    filesha256("${path.module}/../package.json"),
    filesha256("${path.module}/../pnpm-lock.yaml"),
    filesha256("${path.module}/../pnpm-workspace.yaml"),
    filesha256("${path.module}/../index.html"),
    filesha256("${path.module}/../vite.config.ts"),
    filesha256("${path.module}/../tsconfig.json"),
    filesha256("${path.module}/../Dockerfile"),
    filesha256("${path.module}/../nginx.conf"),
    filesha256("${path.module}/../.dockerignore"),
    sha256(join("", [for f in sort(fileset("${path.module}/../src", "**/*")) : filesha256("${path.module}/../src/${f}")])),
  ]))
  ui_image_tag = substr(local.ui_source_hash, 0, 12)
}

resource "docker_image" "ui" {
  name = "dmc268-ui:${local.ui_image_tag}"

  build {
    context    = "${path.module}/.."
    dockerfile = "Dockerfile"
    tag        = ["dmc268-ui:${local.ui_image_tag}"]

    triggers = {
      source_hash = local.ui_source_hash
    }
  }
}

resource "docker_container" "ui" {
  name    = "dmc268-ui"
  image   = docker_image.ui.image_id
  restart = "unless-stopped"

  networks_advanced {
    name = data.docker_network.dmc268.name
  }

  ports {
    internal = 80
    external = var.ui_port
    ip       = var.bind_ip
  }
}
