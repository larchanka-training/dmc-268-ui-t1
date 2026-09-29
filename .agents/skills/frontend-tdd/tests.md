# Хорошие и плохие тесты

## Поведение, а не разметка

```tsx
// ХОРОШО: то, что видит пользователь
render(<ReviewCommentThread comment={comment} />)
await user.click(screen.getByRole('button', { name: 'Ответить' }))
expect(screen.getByRole('textbox')).toBeInTheDocument()

// ПЛОХО: класс и внутреннее устройство
expect(container.querySelector('.thread__reply-form')).toBeTruthy()
```

## Состояние после действия, а не вызов колбэка

```tsx
// ХОРОШО
await user.selectOptions(screen.getByLabelText('Severity'), 'error')
expect(screen.getAllByRole('listitem')).toHaveLength(2)

// ПЛОХО: проверяет, что позвали то, что собирались позвать
expect(onFilterChange).toHaveBeenCalledWith('error')
```

Колбэк проверяется тогда, когда он и есть контракт компонента, — например, у переиспользуемого
`shared/ui` элемента без собственного состояния.

## Данные через адаптер, а не через мок fetch

```tsx
// ХОРОШО: подменяется граница данных
render(<ReviewRunPage />, { wrapper: withReviewApi(mockAdapter) });

// ПЛОХО: тест знает, что внутри fetch и какой у него URL
vi.spyOn(globalThis, "fetch").mockResolvedValue(...);
```

## Тавтология

```ts
// ПЛОХО: пройдёт, даже если formatRange вернёт вход как есть
expect(formatRange(hunk)).toBe(`${hunk.oldStart},${hunk.oldLines}`)

// ХОРОШО: ожидаемое задано вручную
expect(formatRange({ oldStart: 12, oldLines: 3 })).toBe('12,3')
```

## Чистая логика — без рендера

Сборка диффа, фильтрация замечаний и форматтеры тестируются прямым вызовом. Если такую логику
можно проверить только через рендер компонента, она живёт не в том слое.
