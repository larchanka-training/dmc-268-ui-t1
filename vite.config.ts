/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rewriteAppUrl, rewriteStaticPage } from './src/build/appRoutes.ts'
import { mockAuthReply } from './src/build/mockAuth.ts'
import { applyOrigin, buildRobotsTxt, buildSitemapXml, normalizeOrigin } from './src/build/seo.ts'

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// /app и /app/* без расширения отдают HTML приложения, /login — страницу
// входа, так же, как nginx. Vite в режиме mpa сам этого не делает: на
// неизвестный путь он ответил бы 404.
const appRewrite: Connect.NextHandleFunction = (req, _res, next) => {
  const rewritten = req.url ? (rewriteAppUrl(req.url) ?? rewriteStaticPage(req.url)) : null
  if (rewritten) req.url = rewritten
  next()
}

function appRoutes(): Plugin {
  return {
    name: 'dmc268:app-routes',
    configureServer: (server) => void server.middlewares.use(appRewrite),
    configurePreviewServer: (server) => void server.middlewares.use(appRewrite),
  }
}

// Мок /api/v1/auth/* — только для dev-сервера: в сборку не попадает. Против
// настоящего бэкенда выключается VITE_USE_MOCK_API=false: тогда dev-сервер
// проксирует /api на VITE_API_PROXY_TARGET (см. apiProxy).
function mockAuth(useMock: boolean): Plugin {
  return {
    name: 'dmc268:mock-auth',
    apply: 'serve',
    configureServer(server) {
      if (!useMock) return
      server.middlewares.use((req, res, next) => {
        const reply = mockAuthReply(req.method ?? 'GET', req.url ?? '', req.headers.cookie)
        if (!reply) return next()
        res.writeHead(reply.status, reply.headers)
        res.end(reply.body)
      })
    },
  }
}

// Без мока /api уходит на бэкенд через dev-сервер: браузер остаётся на одном
// origin с API, поэтому cookie `session` ставится и отправляется как на стенде.
// Путь не переписывается, заголовки (Cookie, Set-Cookie, Origin) проходят как
// есть. Origin браузера — http://localhost:3000, поэтому у API нужен
// PUBLIC_ORIGIN=http://localhost:3000, иначе он ответит 403 ORIGIN_FORBIDDEN.
function apiProxy(useMock: boolean, target: string | undefined) {
  if (useMock) return undefined
  return { '/api': { target: target || 'http://localhost:8000' } }
}

// Абсолютный адрес стенда нужен canonical, og:url, og:image и файлам для
// роботов. Он известен при сборке образа, поэтому подставляется здесь.
function publicOriginPlugin(publicOrigin: string): Plugin {
  return {
    name: 'dmc268:public-origin',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => applyOrigin(html, publicOrigin),
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobotsTxt(publicOrigin) })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemapXml(publicOrigin),
      })
    },
  }
}

// Переменные читаются из .env, .env.local и окружения оболочки: `process.env`
// файлов .env не видит.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicOrigin = normalizeOrigin(env.PUBLIC_ORIGIN)
  const useMockApi = env.VITE_USE_MOCK_API !== 'false'
  return {
    appType: 'mpa',
    plugins: [
      tailwindcss(),
      react(),
      mockAuth(useMockApi),
      appRoutes(),
      publicOriginPlugin(publicOrigin),
    ],
    resolve: {
      // Алиас `@` берётся из `paths` в tsconfig.json — одно место вместо двух.
      tsconfigPaths: true,
    },
    build: {
      // Полифил modulepreload Vite вставляет отдельным скриптом в каждую
      // страницу с модулем, в том числе в статичную /login. Браузер без
      // поддержки modulepreload (Safari до 17, Firefox до 115) просто не
      // загружает чанки заранее и получает их по import — медленнее, но работает.
      modulePreload: { polyfill: false },
      rolldownOptions: {
        input: {
          main: page('./index.html'),
          app: page('./app/index.html'),
          login: page('./login.html'),
          notFound: page('./404.html'),
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: apiProxy(useMockApi, env.VITE_API_PROXY_TARGET),
    },
    test: {
      environment: 'jsdom',
      // Интеграционные тесты экрана рендерят настоящий diff viewer на сотнях строк:
      // локально самый тяжёлый идёт ~1.7 с, на раннере CI втрое дольше, и дефолтные 5 с
      // срабатывают как ложный провал, а не как сигнал.
      testTimeout: 15000,
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      // .github/tests — тесты actions и скриптов деплоя: гоняют bash через
      // node:child_process, DOM им не нужен, но и не мешает.
      include: ['src/**/*.{test,spec}.{ts,tsx}', '.github/tests/**/*.test.mjs'],
      exclude: ['node_modules', 'dist', '.idea'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          'src/test/setup.ts',
          'src/main.tsx',
          '**/*.config.{ts,js}',
          'coverage/',
        ],
      },
    },
  }
})
