import {
  AppstoreAddOutlined,
  BranchesOutlined,
  CheckSquareOutlined,
  DisconnectOutlined,
  EyeOutlined,
  FileTextOutlined,
  LockOutlined,
  LoginOutlined,
  PauseCircleOutlined,
  PoweroffOutlined,
  PullRequestOutlined,
  RedoOutlined,
  RobotOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Card, Typography } from 'antd'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicLayout } from '@/widgets/app-shell'

const { Title, Paragraph, Text } = Typography

const RULES_EXAMPLE = `## Обработка ошибок

- pattern: \`app/**/*.py\`
- exclude: \`**/tests/**\`

1. Текст ошибки содержит данные, по которым её можно воспроизвести
2. Пойманное исключение либо обработано, либо переброшено с контекстом`

const STEPS: { icon: ReactNode; text: ReactNode }[] = [
  {
    icon: <LoginOutlined aria-hidden />,
    text: <>Войдите через GitHub.</>,
  },
  {
    icon: <AppstoreAddOutlined aria-hidden />,
    text: (
      <>
        Откройте «Репозитории» и нажмите <Text strong>«Добавить репозитории из GitHub»</Text>.
      </>
    ),
  },
  {
    icon: <UserOutlined aria-hidden />,
    text: <>На странице GitHub выберите аккаунт: свой или организацию.</>,
  },
  {
    icon: <CheckSquareOutlined aria-hidden />,
    text: (
      <>
        Отметьте нужные репозитории («Only select repositories»), в том числе приватные, и нажмите{' '}
        <Text strong>Install</Text>.
      </>
    ),
  },
  {
    icon: <PoweroffOutlined aria-hidden />,
    text: (
      <>
        Вернитесь на «Репозитории»: отмеченные репозитории появятся в списке. Если ревью в нужном
        выключено, включите его переключателем «Ревью». Без роли admin или maintain его включит
        администратор.
      </>
    ),
  },
  {
    icon: <PullRequestOutlined aria-hidden />,
    text: (
      <>
        Откройте PR в одном из них: бот пришлёт ревью комментариями, а прогон будет виден в разделе
        «Ревью» бокового меню.
      </>
    ),
  },
]

/** Вопросы: `id` — постоянный якорь для ссылок извне (#96), менять нельзя. */
const FAQ: { id: string; icon: ReactNode; question: string; answer: ReactNode; wide?: boolean }[] =
  [
    {
      id: 'repo-missing',
      icon: <BranchesOutlined aria-hidden />,
      question: 'Почему моего репозитория нет в списке?',
      answer: (
        <Paragraph>
          Список показывает только репозитории, на которые установлено приложение и к которым у вас
          есть доступ на GitHub. Нажмите «Добавить репозитории из GitHub» и отметьте репозиторий.
          Если он в организации, где вы не владелец, вместо Install будет Request: запрос уйдёт
          владельцу, репозиторий появится после одобрения.
        </Paragraph>
      ),
    },
    {
      id: 'toggle-disabled',
      icon: <LockOutlined aria-hidden />,
      question: 'Почему переключатель «Ревью» неактивен?',
      answer: (
        <Paragraph>
          Включать и выключать ревью может участник с ролью admin или maintain в этом репозитории на
          GitHub. С ролью write, triage или read переключатель неактивен: попросите администратора
          репозитория.
        </Paragraph>
      ),
    },
    {
      id: 'bot-silent',
      icon: <RobotOutlined aria-hidden />,
      question: 'Бот не пришёл в PR. Что проверить?',
      answer: (
        <ul>
          <li>Ревью у репозитория включено (переключатель «Ревью»).</li>
          <li>
            Это новый PR или новый пуш в открытый: бот реагирует на открытие PR и на каждый пуш в
            него. Повторное открытие закрытого PR ревью не запускает.
          </li>
          <li>
            Откройте прогон в разделе «Ревью» бокового меню: если он упал, причина видна в его
            шапке.
          </li>
        </ul>
      ),
    },
    {
      id: 'rerun',
      icon: <RedoOutlined aria-hidden />,
      question: 'Как запустить ревью ещё раз?',
      answer: (
        <Paragraph>
          Запушьте в PR новый коммит, и бот проверит его заново. Кнопки ручного запуска пока нет.
        </Paragraph>
      ),
    },
    {
      id: 'pause-review',
      icon: <PauseCircleOutlined aria-hidden />,
      question: 'Как выключить ревью на время?',
      answer: (
        <Paragraph>
          Выключите переключатель «Ревью» в строке репозитория. Бот перестанет приходить в PR, а
          история прогонов сохранится. Включить обратно можно тем же переключателем.
        </Paragraph>
      ),
    },
    {
      id: 'remove-access',
      icon: <DisconnectOutlined aria-hidden />,
      question: 'Как совсем убрать доступ бота к коду?',
      answer: (
        <Paragraph>
          Нажмите «Управлять доступом в GitHub» и снимите галочку с репозитория или удалите
          установку. GitHub перестанет присылать события, бот замолчит, а репозиторий пропадёт из
          списка.
        </Paragraph>
      ),
    },
    {
      id: 'rules',
      icon: <FileTextOutlined aria-hidden />,
      wide: true,
      question: 'Как задать свои правила ревью?',
      answer: (
        <>
          <Paragraph>
            Положите в репозиторий файл <Text code>.review/rules.md</Text>. Каждое правило в нём
            оформляется разделом второго уровня: строки <Text code>pattern:</Text> (к каким файлам)
            и, если нужно, <Text code>exclude:</Text>, ниже нумерованные проверки:
          </Paragraph>
          <pre className="help-code">
            <code>{RULES_EXAMPLE}</code>
          </pre>
          <Paragraph>
            Правила берутся из целевой ветки PR, поэтому правка файла в самом PR начнёт действовать
            после мёржа. Правило без <Text code>pattern:</Text> или без пунктов проверок бот
            пропустит. Без файла бот работает по правилам по умолчанию.
          </Paragraph>
        </>
      ),
    },
    {
      id: 'merge-gate',
      icon: <SafetyOutlined aria-hidden />,
      question: 'Что значит проверка dmc-268-ai-review в PR?',
      answer: (
        <Paragraph>
          Её ставит бот после ревью: «не пройдена», пока открыт тред с критичным замечанием, иначе
          «пройдена». Когда тред закрывают, проверка пересчитывается сама. Блокирует ли она мёрж,
          решает администратор репозитория в настройках GitHub.
        </Paragraph>
      ),
    },
    {
      id: 'who-sees',
      icon: <EyeOutlined aria-hidden />,
      question: 'Кто видит мои прогоны?',
      answer: <Paragraph>Только те, у кого есть доступ к репозиторию на GitHub.</Paragraph>,
    },
  ]

/**
 * Помощь: статичный текст без данных с сервера, открыт без сессии. Поэтому каркас —
 * `PublicLayout` с простой шапкой вместо `AppLayout`: меню и профиль кабинета требуют входа.
 */
export function HelpPage() {
  const { hash } = useLocation()

  // Роутер сам не прокручивает к якорю: делаем это при открытии и при смене `#…`.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <PublicLayout>
      <div className="help-content">
        <Title level={1} className="page-title">
          Помощь
        </Title>
        <Paragraph type="secondary">
          Как подключить репозиторий и что делать, если бот ведёт себя не так, как ожидали.
        </Paragraph>

        <section className="page-section">
          <Title level={2} id="start" className="help-anchor">
            Как начать
          </Title>
          <Card className="app-content-card">
            {/* role: без маркеров Safari перестаёт объявлять список; номер шага читается из порядка. */}
            <ol className="help-steps" role="list">
              {STEPS.map(({ icon, text }, index) => (
                <li key={index}>
                  <span className="help-step-icon">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <Paragraph type="secondary" className="mb-0">
              Сразу после Install сервис может включить ревью сам, но только в отмеченных
              репозиториях. Если на GitHub выбрать «All repositories» или позже добавить репозитории
              в уже установленное приложение, они появятся выключенными.
            </Paragraph>
          </Card>
        </section>

        <section className="page-section">
          <Title level={2} id="faq">
            Вопросы и ответы
          </Title>
          <div className="help-faq">
            {FAQ.map(({ id, icon, question, answer, wide }) => (
              <Card
                key={id}
                className={`app-content-card${wide ? ' help-faq-wide' : ''}`}
                role="article"
              >
                <Title level={3} id={id} className="help-anchor help-question">
                  <span className="help-question-icon">{icon}</span>
                  {question}
                </Title>
                {answer}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}
