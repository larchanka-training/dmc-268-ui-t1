# Деплой UI (nginx + сборка Vite)

Нужны **Docker Engine** на целевом хосте и Terraform >= 1.5. Этот стек поднимает только фронтенд. PostgreSQL и RabbitMQ находятся в `dmc-268-api-t1/infra/`.

Скопируйте `terraform.tfvars.example` в `terraform.tfvars`, если нужно изменить хост или порт.

- Локальный демон: `docker_host = "unix:///var/run/docker.sock"`
- Удалённый сервер: `docker_host = "ssh://user@server"`

Порт по умолчанию слушает `127.0.0.1` (`ui_port`, по умолчанию 8080).

```bash
cd infra
terraform init
terraform apply
terraform destroy
```

Выход: `ui_url`.
