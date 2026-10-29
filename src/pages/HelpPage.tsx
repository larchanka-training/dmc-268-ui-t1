import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Layout, Typography } from 'antd'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppTheme } from '@/features/theme'

const { Title, Paragraph, Text } = Typography

const RULES_EXAMPLE = `## Обработка ошибок

- pattern: \`app/**/*.py\`
- exclude: \`**/tests/**\`

1. Текст ошибки содержит данные, по которым её можно воспроизвести
2. Пойманное исключение либо обработано, либо переброшено с контекстом`

/** Вопросы: `id` — постоянный якорь, на него ссылаются подсказки «Репозиториев», менять нельзя. */
const FAQ: { id: string; question: string; answer: ReactNode }[] = [
  {
    id: 'repo-missing',
    question: 'Почему моего репозитория нет в списке?',
    answer: (
      <Paragraph>
        Список показывает только репозитории, на которые установлено приложение и к которым у вас
        есть доступ на GitHub. Нажмите «Добавить репозитории из GitHub» и отметьте репозиторий. Если
        он в организации, где вы не владелец, вместо Install будет Request: запрос уйдёт владельцу,
        репозиторий появится после одобрения.
      </Paragraph>
    ),
  },
  {
    id: 'toggle-disabled',
    question: 'Почему переключатель «Ревью» неактивен?',
    answer: (
      <Paragraph>
        Включать и выключать ревью может участник с ролью admin или maintain в этом репозитории на
        GitHub. С ролью write, triage или read переключатель неактивен — попросите администратора
        репозитория.
      </Paragraph>
    ),
  },
  {
    id: 'bot-silent',
    question: 'Бот не пришёл в PR. Что проверить?',
    answer: (
      <ul>
        <li>Ревью у репозитория включено (переключатель «Ревью»).</li>
        <li>
          Это новый PR или новый пуш в открытый: бот реагирует на открытие PR и на каждый пуш в
          него.
        </li>
        <li>Статус прогона во вкладке «Ревью»: если он упал, там видна причина.</li>
      </ul>
    ),
  },
  {
    id: 'rerun',
    question: 'Как запустить ревью ещё раз?',
    answer: (
      <Paragraph>
        Запушьте в PR новый коммит — бот проверит его заново. Кнопки ручного запуска пока нет.
      </Paragraph>
    ),
  },
  {
    id: 'pause-review',
    question: 'Как выключить ревью на время?',
    answer: (
      <Paragraph>
        Переключатель «Ревью» в строке репозитория. Бот перестаёт приходить в PR, история прогонов
        сохраняется, включить обратно можно тем же переключателем.
      </Paragraph>
    ),
  },
  {
    id: 'remove-access',
    question: 'Как совсем убрать доступ бота к коду?',
    answer: (
      <Paragraph>
        «Управлять доступом в GitHub» → снимите галочку с репозитория или удалите установку. GitHub
        перестанет присылать события, бот замолчит, репозиторий пропадёт из списка.
      </Paragraph>
    ),
  },
  {
    id: 'rules',
    question: 'Как задать свои правила ревью?',
    answer: (
      <>
        <Paragraph>
          Положите в репозиторий файл <Text code>.review/rules.md</Text>. Каждое правило — раздел
          второго уровня: строки <Text code>pattern:</Text> (к каким файлам) и, если нужно,{' '}
          <Text code>exclude:</Text>, ниже нумерованные проверки:
        </Paragraph>
        <pre className="help-code">
          <code>{RULES_EXAMPLE}</code>
        </pre>
        <Paragraph>
          Правила берутся из целевой ветки PR. Без файла бот работает по правилам по умолчанию;
          статус файла виден в настройках репозитория.
        </Paragraph>
      </>
    ),
  },
  {
    id: 'merge-gate',
    question: 'Что значит проверка dmc-268-ai-review в PR?',
    answer: (
      <Paragraph>
        Её ставит бот после ревью: «не пройдена», пока открыт тред с критичным замечанием, иначе
        «пройдена». Закрыли тред — проверка пересчитывается сама. Блокирует ли она мёрж, решает
        администратор репозитория в настройках GitHub.
      </Paragraph>
    ),
  },
  {
    id: 'who-sees',
    question: 'Кто видит мои прогоны?',
    answer: <Paragraph>Только те, кто видит репозиторий на GitHub.</Paragraph>,
  },
]

/**
 * Помощь: статичный текст без данных с сервера, открыт без сессии. Поэтому у страницы своя
 * простая шапка вместо `AppLayout`: меню и профиль кабинета требуют входа.
 */
export function HelpPage() {
  const { mode, toggleMode } = useAppTheme()
  const { hash } = useLocation()

  // Роутер сам не прокручивает к якорю: делаем это при открытии и при смене `#…`.
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  return (
    <Layout className="app-layout-root">
      <Layout.Header className="app-shell-header-bar app-main-header help-header">
        <Link to="/">DMC Console</Link>
        <Button
          type="text"
          icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleMode}
          aria-label="Переключить тему"
        />
      </Layout.Header>
      <Layout.Content className="app-layout-content">
        <main className="help-content">
          <Title level={1} className="page-title">
            Помощь
          </Title>

          <section aria-labelledby="start" className="page-section">
            <Title level={2} id="start" className="help-anchor">
              Как начать
            </Title>
            <ol>
              <li>Войдите через GitHub.</li>
              <li>
                Откройте «Репозитории» и нажмите{' '}
                <Text strong>«Добавить репозитории из GitHub»</Text>.
              </li>
              <li>На странице GitHub выберите аккаунт — свой или организацию.</li>
              <li>
                Отметьте нужные репозитории («Only select repositories»), в том числе приватные, и
                нажмите <Text strong>Install</Text>.
              </li>
              <li>
                GitHub вернёт вас в сервис — отмеченные репозитории уже в списке, ревью включено.
              </li>
              <li>
                Откройте PR в одном из них: бот пришлёт ревью комментариями, а прогон будет виден во
                вкладке «Ревью».
              </li>
            </ol>
            <Paragraph>
              Выбрали «All repositories» — репозитории появятся выключенными: включите нужные
              переключателем «Ревью».
            </Paragraph>
          </section>

          <section aria-labelledby="faq" className="page-section">
            <Title level={2} id="faq">
              Вопросы и ответы
            </Title>
            {FAQ.map(({ id, question, answer }) => (
              <article key={id} aria-labelledby={id}>
                <Title level={3} id={id} className="help-anchor">
                  {question}
                </Title>
                {answer}
              </article>
            ))}
          </section>
        </main>
      </Layout.Content>
    </Layout>
  )
}
