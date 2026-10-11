## Purpose

Mock OAuth и клиентская сессия для кабинета до готовности бэкенда.

## ADDED Requirements

### Requirement: Mock OAuth login

The application SHALL offer sign-in via GitHub and GitLab in mock mode by redirecting to `/oauth/callback` with `code` and `state` query parameters after the user selects a provider.

#### Scenario: Successful mock callback

- **WHEN** the user completes mock OAuth and lands on `/oauth/callback` with a valid `state` matching session storage
- **THEN** the application exchanges the code for a session (mock)
- **AND** redirects the authenticated user to the repositories page

#### Scenario: Invalid OAuth state

- **WHEN** the callback `state` does not match the value stored for the login attempt
- **THEN** the application SHALL show an error in Russian
- **AND** SHALL NOT create a session

### Requirement: Persisted session validation

Data read from `localStorage` at the session boundary SHALL be treated as `unknown` and validated before use. Invalid data SHALL be removed from storage and SHALL NOT crash the application.

#### Scenario: Corrupt session JSON

- **WHEN** stored session value is `{}`, a partial object, or non-object JSON
- **THEN** `loadSession` SHALL return `null`
- **AND** SHALL clear the storage key

#### Scenario: Valid session restore

- **WHEN** stored session matches the expected shape and access token is not expired
- **THEN** the user SHALL be treated as authenticated after reload

### Requirement: Protected routes

Routes under the cabinet shell SHALL require authentication and SHALL redirect anonymous users to `/login` with return path preserved.
