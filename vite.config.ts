import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { falDevMiddleware } from './server/fal-proxy.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.FAL_KEY = env.FAL_KEY ?? ''

  return {
    plugins: [
      react(),
      {
        name: 'fal-dev-proxy',
        configureServer(server) {
          server.middlewares.use(falDevMiddleware)
        },
      },
    ],
  }
})
