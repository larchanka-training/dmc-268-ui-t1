## 1. Основа данных и состояния

- [x] 1.1 Добавить и проверить зависимости TanStack Query, Zustand, Headless UI и Zod через `pnpm`; убедиться, что `pnpm run typecheck` проходит.
- [x] 1.2 Создать UI-типы review run, diff и `ReviewFinding`, Zod-схемы и типизированный mock adapter; проверить тестом корректные и некорректные данные adapter.
- [x] 1.3 Подключить `QueryClientProvider` и создать Zustand-store `ReviewWorkspace` для выбранного файла и severity-фильтров; проверить, что server state не дублируется в store.

## 2. Unified Diff Viewer

- [x] 2.1 Создать `ReviewRunPage`, заголовок прогона и список файлов; проверить тестом, что выбор файла меняет отображаемый diff.
- [x] 2.2 Реализовать `DiffViewer`, `DiffHunk` и `DiffLine` для одного выбранного файла в unified-порядке; проверить отображение removed, added и context-строк с номерами.
- [x] 2.3 Реализовать inline `ReviewFinding` только для соответствующей changed-строки своей стороны; проверить, что finding не прикрепляется к context-строке.
- [x] 2.4 Добавить доступные контролы выбора файла и severity-фильтров; проверить взаимодействие с клавиатуры через React Testing Library.
- [x] 2.5 Реализовать `RunInspector` с mock-хронологией и локальным выбором действия; проверить тестом отображение деталей выбранного действия.

## 3. Интеграция и проверка

- [x] 3.1 Обновить `FRONTEND_ARCHITECTURE.md` по фактически реализованной структуре; проверить, что описание не обещает HTTP API, side-by-side или раскрытие скрытого context.
- [ ] 3.2 Запустить `pnpm run typecheck`, `pnpm run lint`, `pnpm run stylelint`, `pnpm run format:check`, `pnpm run test` и `pnpm run build`; исправить нарушения, связанные с change.
