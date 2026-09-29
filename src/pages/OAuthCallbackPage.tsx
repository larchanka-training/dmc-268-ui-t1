import { Alert, Spin, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeOAuthCallback, useAuth } from '@/features/auth'

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
        handledRef.current = false
        const message = err instanceof Error ? err.message : 'Ошибка OAuth'
        setError(message)
      })
  }, [loginWithSession, navigate, searchParams])

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: 24 }}>
        <Alert
          type="error"
          message="Не удалось войти"
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Завершаем вход…
      </Typography.Paragraph>
    </div>
  )
}
