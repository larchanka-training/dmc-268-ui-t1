# Tasks

## 1. Action

- [x] 1.1 Порт 9000 константой в `state-tunnel`, input `port` и `with:` в `deploy.yml` удалить
- [x] 1.2 Удалить проверку `Host stand` и тест `state-tunnel без хоста stand падает…`
- [x] 1.3 Шаг туннеля с фейковыми `ssh` и `curl`: `ssh -L 9000:127.0.0.1:9000 stand` с `ControlPath=none`, выход 0 при ответе хранилища
