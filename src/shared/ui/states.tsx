import { Button } from 'antd'
import type { ReactNode } from 'react'

export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <p role="status" className="p-6 text-sm text-slate-500">
      {label}
    </p>
  )
}

type ErrorStateProps = {
  title: string
  error?: unknown
  onRetry?: () => void
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="font-medium">{title}</p>
      {error instanceof Error && <p className="mt-1 text-red-700">{error.message}</p>}
      {onRetry && (
        <Button size="small" danger onClick={onRetry} className="mt-3 font-medium">
          Повторить
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}
