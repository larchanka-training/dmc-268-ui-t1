/** Убирает обратные кавычки вокруг кода: для подписей, где разметка не отображается. */
export function stripCodeMarks(text: string): string {
  return text.replace(/`([^`\n]+)`/g, '$1')
}
