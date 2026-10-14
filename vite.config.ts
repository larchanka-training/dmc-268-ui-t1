/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rewriteAppUrl, rewriteStaticPage } from './src/build/appRoutes.ts'
import { applyOrigin, buildRobotsTxt, buildSitemapXml, normalizeOrigin } from './src/build/seo.ts'

const publicOrigin = normalizeOrigin(process.env.PUBLIC_ORIGIN)

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

// Абсолютный адрес стенда нужен canonical, og:url, og:image и файлам для
// роботов. Он известен при сборке образа, поэтому подставляется здесь.
function publicOriginPlugin(): Plugin {
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

export default defineConfig({
  appType: 'mpa',
  plugins: [tailwindcss(), react(), appRoutes(), publicOriginPlugin()],
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
  },
  test: {
    environment: 'jsdom',
    // Интеграционные тесты экрана рендерят настоящий diff viewer на сотнях строк:
    // локально самый тяжёлый идёт ~1.7 с, на раннере CI втрое дольше, и дефолтные 5 с
    // срабатывают как ложный провал, а не как сигнал.
    testTimeout: 15000,
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
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
})
