/**
 * Production server: static `dist/` + fal proxy on the same origin.
 * Binds 0.0.0.0:$PORT for Render.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleRequest } from '@fal-ai/server-proxy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT) || 4173
const HOST = '0.0.0.0'

const PROXY_PATH = '/api/fal/proxy'
const HEALTH_PATH = '/api/fal/health'

const falProxyConfig = {
  allowedUrlPatterns: [
    'fal.run/**',
    '*.fal.run/**',
    'fal.ai/**',
    '*.fal.ai/**',
  ],
  allowedEndpoints: [],
  allowUnauthorizedRequests: true,
  isAuthenticated: async () => true,
  resolveFalAuth: async () => {
    const key = process.env.FAL_KEY
    if (!key) return undefined
    return `Key ${key}`
  },
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

function requestPath(url) {
  const raw = url ?? '/'
  const q = raw.indexOf('?')
  return q === -1 ? raw : raw.slice(0, q)
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) return undefined
  return Buffer.concat(chunks).toString('utf8')
}

async function handleProxy(req, res) {
  await handleRequest(
    {
      id: 'prod',
      method: req.method ?? 'GET',
      getRequestBody: () => readBody(req),
      getHeaders: () => req.headers,
      getHeader: (name) => req.headers[name.toLowerCase()],
      sendHeader: (name, value) => {
        res.setHeader(name, value)
      },
      respondWith: (status, data) => {
        sendJson(res, status, data)
      },
      sendResponse: async (falResponse) => {
        res.statusCode = falResponse.status
        res.end(Buffer.from(await falResponse.arrayBuffer()))
      },
    },
    falProxyConfig,
  )
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const full = path.join(root, cleaned)
  if (!full.startsWith(root)) return null
  return full
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase()
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
  createReadStream(filePath).pipe(res)
}

async function serveStatic(req, res) {
  const urlPath = requestPath(req.url)
  const candidate = safeJoin(DIST, urlPath === '/' ? '/index.html' : urlPath)

  if (candidate && existsSync(candidate)) {
    serveFile(candidate, res)
    return
  }

  // SPA fallback
  const index = path.join(DIST, 'index.html')
  if (existsSync(index)) {
    res.statusCode = 200
    res.setHeader('Content-Type', MIME['.html'])
    res.end(await readFile(index))
    return
  }

  sendJson(res, 404, { error: 'Not found' })
}

const server = createServer((req, res) => {
  const p = requestPath(req.url)

  if (p === HEALTH_PATH) {
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.end()
      return
    }
    sendJson(res, 200, { configured: Boolean(process.env.FAL_KEY) })
    return
  }

  if (p === PROXY_PATH) {
    void handleProxy(req, res).catch(() => {
      if (!res.headersSent) {
        sendJson(res, 502, { error: 'Proxy failed' })
        return
      }
      res.end()
    })
    return
  }

  void serveStatic(req, res).catch(() => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Server error' })
    }
  })
})

if (!existsSync(DIST)) {
  console.error(`Missing ${DIST} — run npm run build first.`)
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log(`poly-formula listening on http://${HOST}:${PORT}`)
})
