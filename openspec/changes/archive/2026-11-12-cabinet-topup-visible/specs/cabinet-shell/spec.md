## MODIFIED Requirements

### Requirement: App shell layout

Authenticated users SHALL see a shell with sidebar navigation, header (user, provider, sign out), and theme toggle. Уже 768 px сайдбар SHALL уходить в выдвижное меню по кнопке в шапке, а шапка SHALL оставлять баланс, пополнение, тему и аватар без логина и провайдера.

#### Scenario: Theme toggle

- **WHEN** the user toggles theme in the header
- **THEN** the UI SHALL switch between light and dark modes
- **AND** the choice SHALL persist across reloads

#### Scenario: Узкий экран

- **WHEN** кабинет открыт на экране уже 768 px
- **THEN** сайдбара нет, «Открыть меню» в шапке показывает навигацию, а переход по пункту закрывает меню
