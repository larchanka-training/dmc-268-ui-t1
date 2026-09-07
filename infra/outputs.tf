output "ui_url" {
  description = "HTTP URL of the deployed UI."
  value       = "http://${var.bind_ip}:${var.ui_port}"
}
