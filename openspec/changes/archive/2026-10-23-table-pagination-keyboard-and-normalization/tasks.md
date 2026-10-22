# Tasks

## 1. Механизм

- [x] 1.1 `useUrlPage` без `total`; `pageCountOf`, `clampPage`, `pageSlice`; `useNormalizeUrlPage` с `replace` на последнюю страницу
- [x] 1.2 `PageNav` в `shared/ui`: навигация ссылками, одна остановка Tab на пункт, Space переходит; пагинация antd выключена
- [x] 1.3 Тест серверного сценария: `?page=99` → запрос с большим offset → `total` → `replace` на последнюю → второй запрос

## 2. Поиск

- [x] 2.1 Первая правка серии — push, следующие — replace
- [x] 2.2 Поле принимает `q` при любом внешнем переходе, включая PUSH на тот же маршрут

## 3. Тесты и проверки

- [x] 3.1 Клавиатура, PUSH-навигация, «total пришёл позже», нормализация URL и `aria-current`
- [x] 3.2 `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`, `spec:validate`
