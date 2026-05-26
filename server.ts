import 'dotenv/config'
import compression from 'compression'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import {
  listCompaniesWithFundamentals,
  loadTickerData,
  loadTickerDataBatch,
  searchTickerSuggestions,
  type TickerResponse,
} from './src/server/stockApi'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 5173

type Render = (args: { initialData: TickerResponse; initialTicker: string }) => string

async function createApp() {
  const app = express()
  app.use(compression())

  let vite: ViteDevServer | undefined
  let template = ''
  let prodRender: Render | undefined

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    template = await fs.readFile(path.resolve(__dirname, 'dist/index.html'), 'utf-8')
    prodRender = (await import('./dist/entry-server.js')).render
    app.use(sirv(path.resolve(__dirname, 'dist'), { extensions: [] }))
  }

  function resolveTickerFromRequest(req: express.Request): string {
    const fromPath =
      typeof req.params?.ticker === 'string' && req.params.ticker.trim().length > 0
        ? req.params.ticker
        : ''
    const fromQuery =
      typeof req.query.ticker === 'string' && req.query.ticker.trim().length > 0
        ? req.query.ticker
        : ''
    return (fromPath || fromQuery || 'MSFT').toUpperCase().trim() || 'MSFT'
  }

  app.get('/api/fundamentals', async (req, res) => {
    const ticker = resolveTickerFromRequest(req)
    const data = await loadTickerData(ticker)
    res.json(data)
  })

  app.get('/api/fundamentals/batch', async (req, res) => {
    const raw = String(req.query.tickers ?? '')
    const tickers = raw
      .split(',')
      .map((ticker) => ticker.trim())
      .filter(Boolean)
    const fallback = tickers.length === 0 ? ['MSFT', 'AAPL', 'NVDA'] : tickers
    const data = await loadTickerDataBatch(fallback)
    res.json(data)
  })

  app.get('/api/tickers/suggest', async (req, res) => {
    const query = String(req.query.q ?? '')
    const results = await searchTickerSuggestions(query)
    res.json(results)
  })

  app.get('/', async (_req, res) => {
    const companies = await listCompaniesWithFundamentals()
    const rows = companies
      .map((company) => {
        const meta = [company.sector, company.industry].filter(Boolean).join(' • ')
        const hasPrice = typeof company.latestPrice === 'number' && company.latestPrice > 0
        const isPositive = (company.dayChange ?? 0) >= 0
        const changeText =
          typeof company.dayChange === 'number' && typeof company.dayChangePct === 'number'
            ? `${isPositive ? '+' : ''}${company.dayChange.toFixed(2)} (${isPositive ? '+' : ''}${company.dayChangePct.toFixed(2)}%) 24h`
            : '--'
        return `<li>
  <a href="/ticker/${encodeURIComponent(company.symbol)}" class="row-link">
    <div class="left">
      <img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.symbol)} logo" class="logo" loading="lazy" />
      <div class="text">
        <div><strong>${escapeHtml(company.symbol)}</strong> — ${escapeHtml(company.companyName)}</div>
        ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}
      </div>
    </div>
    <div class="right">
      <div class="price">${hasPrice ? `${company.latestPrice?.toFixed(2)} USD` : '--'}</div>
      <div class="change ${isPositive ? 'up' : 'down'}">${hasPrice ? changeText : '--'}</div>
    </div>
  </a>
</li>`
      })
      .join('')

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fundamentals Home</title>
    <style>
      body { font-family: "Space Grotesk", "Segoe UI", sans-serif; margin: 0; background: #ffffff; color: #0f172a; }
      main { max-width: 980px; margin: 0 auto; padding: 32px 16px; }
      h1 { margin: 0 0 8px 0; font-size: 28px; }
      p { margin: 0 0 20px 0; color: #475569; }
      ul { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
      li { border-bottom: 1px solid #e2e8f0; }
      li:last-child { border-bottom: 0; }
      .row-link { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; color: inherit; text-decoration: none; }
      .row-link:hover { background: #f8fafc; }
      .left { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .logo { width: 28px; height: 28px; border-radius: 999px; border: 1px solid #e2e8f0; object-fit: contain; background: #fff; flex-shrink: 0; }
      .text { min-width: 0; }
      .meta { color: #64748b; font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .right { text-align: right; flex-shrink: 0; }
      .price { font-weight: 600; }
      .change { font-size: 12px; margin-top: 2px; }
      .change.up { color: #16a34a; }
      .change.down { color: #dc2626; }
      .empty { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; color: #475569; }
    </style>
  </head>
  <body>
    <main>
      <h1>Companies With Fundamentals</h1>
      <p>${companies.length} companies available</p>
      ${companies.length > 0 ? `<ul>${rows}</ul>` : '<div class="empty">No companies found yet. Run sync first.</div>'}
    </main>
  </body>
</html>`

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  })

  const renderPage = async (req: express.Request, res: express.Response) => {
    try {
      const url = req.originalUrl
      const ticker = resolveTickerFromRequest(req)
      const initialData = await loadTickerData(ticker)

      let htmlTemplate: string
      let render: Render

      if (!isProd && vite) {
        const rawTemplate = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8')
        htmlTemplate = await vite.transformIndexHtml(url, rawTemplate)
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
      } else {
        htmlTemplate = template
        render = prodRender as Render
      }

      const appHtml = render({ initialData, initialTicker: ticker })
      const payload = JSON.stringify({ initialData, initialTicker: ticker }).replace(/</g, '\\u003c')

      const html = htmlTemplate
        .replace('<!--app-html-->', appHtml)
        .replace('<!--initial-data-->', `<script>window.__INITIAL_STATE__=${payload}</script>`)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (error) {
      if (vite) {
        vite.ssrFixStacktrace(error as Error)
      }
      console.error(error)
      res.status(500).send('Internal Server Error')
    }
  }

  app.get('/ticker/:ticker', renderPage)
  app.use(renderPage)

  return app
}

createApp().then((app) => {
  app.listen(port, () => {
    console.log(`SSR server running at http://localhost:${port}`)
  })
})

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
