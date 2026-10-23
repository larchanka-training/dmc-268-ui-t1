import { Button } from 'antd'
import type { ButtonProps } from 'antd'
import { useHref, useLinkClickHandler } from 'react-router-dom'

type LinkButtonProps = Omit<ButtonProps, 'href' | 'onClick'> & {
  /** Адрес внутри приложения; `basename` роутера учитывается, как у `Link`. */
  to: string
}

/**
 * Ссылка, оформленная кнопкой: один элемент `<a>` в стилях antd `Button` — без `<button>`
 * внутри `<a>`. `href` настоящий: средний клик и «открыть в новой вкладке» работают; обычный
 * клик идёт через роутер (`useLinkClickHandler` сам пропускает клики с модификаторами).
 * Доступное имя — как у кнопки: текст или `aria-label`.
 */
export function LinkButton({ to, ...buttonProps }: LinkButtonProps) {
  const href = useHref(to)
  const handleClick = useLinkClickHandler<HTMLAnchorElement>(to)
  return <Button {...buttonProps} href={href} onClick={handleClick} />
}
