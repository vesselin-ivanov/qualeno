import 'dotenv/config'
import { listSheetTickers, syncTicker } from '../src/server/stockApi'

type CliOptions = {
  tickers: string[]
  delayMs: number
  sheetAll: boolean
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const tickers = await resolveTickers(options)

  if (tickers.length === 0) {
    console.error('No tickers provided. Use --tickers AAPL,MSFT or --sheet-all')
    process.exit(1)
  }

  console.log(`Sync started for ${tickers.length} tickers`)

  let successCount = 0
  let failCount = 0

  for (const [index, ticker] of tickers.entries()) {
    const step = `[${index + 1}/${tickers.length}]`
    try {
      const data = await syncTicker(ticker)
      const status = data.error ? 'partial' : 'ok'
      console.log(`${step} ${ticker}: ${status}`)
      successCount += 1
    } catch (error) {
      failCount += 1
      console.error(`${step} ${ticker}: failed`, error)
    }

    if (index < tickers.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs)
    }
  }

  console.log(`Sync complete. success=${successCount} failed=${failCount}`)
  if (failCount > 0) {
    process.exitCode = 1
  }
}

function parseArgs(args: string[]): CliOptions {
  let tickersArg = ''
  let delayMs = 12000
  let sheetAll = false

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if ((arg === '--tickers' || arg === '-t') && args[i + 1]) {
      tickersArg = args[i + 1]
      i += 1
      continue
    }

    if ((arg === '--delay' || arg === '-d') && args[i + 1]) {
      const parsedDelay = Number(args[i + 1])
      if (Number.isFinite(parsedDelay) && parsedDelay >= 0) {
        delayMs = parsedDelay
      }
      i += 1
      continue
    }

    if (arg === '--sheet-all') {
      sheetAll = true
    }
  }

  return {
    tickers: tickersArg
      .split(',')
      .map((ticker) => ticker.trim().toUpperCase())
      .filter(Boolean),
    delayMs,
    sheetAll,
  }
}

async function resolveTickers(options: CliOptions): Promise<string[]> {
  if (options.sheetAll) {
    return listSheetTickers()
  }
  return Array.from(new Set(options.tickers))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error('sync-tickers failed', error)
  process.exit(1)
})
