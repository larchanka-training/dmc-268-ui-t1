import { Alert, Spin, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeOAuthCallback, useAuth } from '@/features/auth'
import styles from '@/pages/OAuthCallbackPage.module.css'

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    completeOAuthCallback(code, state)
      .then((session) => {
        loginWithSession(session)
        navigate('/repositories', { replace: true })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Ошибка OAuth'
        setError(message)
      })
  }, [loginWithSession, navigate, searchParams])

  if (error) {
    return (
      <div className="mx-auto my-20 max-w-[480px] p-6">
        <Alert
          type="error"
          title="Не удалось войти"
          description={error}
          action={
            <Typography.Link onClick={() => navigate('/login', { replace: true })}>
              Вернуться ко входу
            </Typography.Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-20">
      <Spin size="large" />
      <Typography.Paragraph type="secondary" className={styles.hint}>
        Завершаем вход…
      </Typography.Paragraph>
    </div>
  )
}
