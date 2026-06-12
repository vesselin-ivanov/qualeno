import { renderToString } from 'react-dom/server'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import Homepage from './components/Homepage'
import type { FundamentalsCompany } from './server/stockApi'
import type { TickerResponse } from './types'

export function render(args: { initialData: TickerResponse; initialTicker: string }) {
  return renderToString(
    <App initialData={args.initialData} initialTicker={args.initialTicker} />,
  )
}

export function renderHomepage(args: { companies: FundamentalsCompany[] }) {
  return renderToStaticMarkup(<Homepage companies={args.companies} />)
}
