# Tasks

## 1. Механизм

- [x] 1.1 Хук `useUrlPagination` в `shared/lib`: `page` из URL с проверкой, ограничение числом страниц, `offset`, ссылка на страницу с прочими параметрами
- [x] 1.2 `linkPagination` в `shared/ui`: пагинация antd `Table` на ссылках `Link`
- [x] 1.3 Тест хука

## 2. Таблицы

- [x] 2.1 `/repositories`: страница из URL
- [x] 2.2 `/repositories/connect`: страница и поиск `q` из URL, смена поиска сбрасывает страницу
- [x] 2.3 Тесты страниц: `?page=2`, ссылка «вперёд», смена URL и «назад», некорректный `page`, сброс страницы при поиске

## 3. Проверки

- [x] 3.1 `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`, `spec:validate`
