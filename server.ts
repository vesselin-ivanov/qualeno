import 'dotenv/config'
import compression from 'compression'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sirv from 'sirv'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import {
  listCompaniesWithFundamentals,
  loadTickerData,
  loadTickerDataBatch,
  searchTickerSuggestions,
} from './src/server/stockApi.js'
import type { TickerResponse } from './src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 5173

type Render = (args: { initialData: TickerResponse; initialTicker: string }) => string
type RenderHomepage = (args: { companies: Awaited<ReturnType<typeof listCompaniesWithFundamentals>> }) => string
type SsrModule = {
  render: Render
  renderHomepage: RenderHomepage
}

async function createApp() {
  const app = express()
  app.use(compression())

  let vite: ViteDevServer | undefined
  let template = ''
  let prodRender: Render | undefined
  let prodRenderHomepage: RenderHomepage | undefined

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    template = await fs.readFile(path.resolve(__dirname, 'dist/index.html'), 'utf-8')
    const ssrEntry = pathToFileURL(path.resolve(__dirname, 'dist/entry-server.js')).href
    const ssrModule = (await import(ssrEntry)) as SsrModule
    prodRender = ssrModule.render
    prodRenderHomepage = ssrModule.renderHomepage
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
    let html: string
    if (!isProd && vite) {
      const module = await vite.ssrLoadModule('/src/components/Homepage.tsx')
      const Homepage = module.default as (props: { companies: unknown[] }) => ReactElement
      const markup = renderToStaticMarkup(Homepage({ companies }))
      html = await vite.transformIndexHtml('/', `<!doctype html>${markup}`)
    } else {
      html = `<!doctype html>${(prodRenderHomepage as RenderHomepage)({ companies })}`
    }
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
export default createApp
