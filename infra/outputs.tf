output "ui_url" {
  # service_host, а не bind_ip: второй отвечает на вопрос «на каком интерфейсе
  # слушать» и при 0.0.0.0 как имя хоста бессмысленен. Порт опускается, когда
  # он стандартный, — иначе адрес выглядит нарочито.
  description = "URL развёрнутого интерфейса."
  value = (var.public_tls ? "https://${var.service_host}" :
  var.ui_port == 80 ? "http://${var.service_host}" : "http://${var.service_host}:${var.ui_port}")
}
