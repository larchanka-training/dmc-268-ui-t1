/** Текст, где фрагменты в обратных кавычках показаны как код. Остальная разметка не трогается. */
export function TextWithCode({ text }: { text: string }) {
  return text.split(/(`[^`\n]+`)/).map((part, index) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <code
        key={index}
        className="rounded bg-slate-100 px-1 py-px font-mono text-[0.9em] break-all"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  )
}
