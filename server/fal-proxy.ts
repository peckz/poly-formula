import {
  handleRequest,
  type HeaderValue,
} from '@fal-ai/server-proxy'
import type { IncomingMessage, ServerResponse } from 'node:http'

const PROXY_PATH = '/api/fal/proxy'
const HEALTH_PATH = '/api/fal/health'

const falProxyConfig = {
  allowedUrlPatterns: [
    'fal.run/**',
    '*.fal.run/**',
    'fal.ai/**',
    '*.fal.ai/**',
  ],
  allowedEndpoints: [] as string[],
  allowUnauthorizedRequests: true,
  isAuthenticated: async () => true,
  resolveFalAuth: async () => {
    const key = process.env.FAL_KEY
    if (!key) {
      return undefined
    }
    return `Key ${key}`
  },
}

function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? ''
  const query = raw.indexOf('?')
  if (query === -1) {
    return raw
  }
  return raw.slice(0, query)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) {
    return undefined
  }
  return Buffer.concat(chunks).toString('utf8')
}

function handleHealth(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end()
    return
  }
  sendJson(res, 200, { configured: Boolean(process.env.FAL_KEY) })
}

async function handleProxy(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await handleRequest(
    {
      id: 'vite',
      method: req.method ?? 'GET',
      getRequestBody: () => readBody(req),
      getHeaders: () => req.headers as Record<string, HeaderValue>,
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

export function falDevMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
): void {
  const path = requestPath(req)
  if (path === HEALTH_PATH) {
    handleHealth(req, res)
    return
  }
  if (path === PROXY_PATH) {
    void handleProxy(req, res).catch(() => {
      if (!res.headersSent) {
        sendJson(res, 502, { error: 'Proxy failed' })
        return
      }
      res.end()
    })
    return
  }
  next()
}
