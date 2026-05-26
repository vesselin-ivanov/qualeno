import { renderToString } from 'react-dom/server'
import App from './App'
import type { TickerResponse } from './types'

export function render(args: { initialData: TickerResponse; initialTicker: string }) {
  return renderToString(
    <App initialData={args.initialData} initialTicker={args.initialTicker} />,
  )
}
