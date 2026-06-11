import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ReportPeriod, TickerResponse } from './types'
import FundamentalsCharts from './components/FundamentalsCharts'
import MetricCard from './components/MetricCard'
import Header from './components/Header'

type AppProps = {
  initialTicker: string
  initialData: TickerResponse
}

type TickerSuggestion = {
  symbol: string
  companyName: string
  logoUrl: string
}

export default function App({ initialTicker, initialData }: AppProps) {
  const [tickerInput, setTickerInput] = useState(initialTicker)
  const [currentData, setCurrentData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('quarterly')
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sortedPriceHistory = useMemo(
    () => [...currentData.priceHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [currentData.priceHistory],
  )
  const activeReports =
    reportPeriod === 'annual'
      ? currentData.annualReports
      : currentData.quarterlyReports.length > 0
        ? currentData.quarterlyReports
        : currentData.reports
  const hasData = activeReports.length > 0
  const chartData = useMemo(
    () =>
      activeReports.map((report) => ({
        ...report,
        quarter:
          reportPeriod === 'annual'
            ? formatAnnualLabel(report.fiscalDateEnding)
            : formatQuarterLabel(report.fiscalDateEnding),
      })),
    [activeReports, reportPeriod],
  )
  const priceData = useMemo(
    () =>
      sortedPriceHistory.map((point) => ({
        ...point,
        day: formatDailyLabel(point.date),
      })),
    [sortedPriceHistory],
  )
  const latestPrice = sortedPriceHistory.at(-1)?.close ?? 0
  const previousPrice = sortedPriceHistory.at(-2)?.close ?? latestPrice
  const dayChange = latestPrice - previousPrice
  const dayChangePct = previousPrice !== 0 ? (dayChange / previousPrice) * 100 : 0
  const isPositiveChange = dayChange >= 0

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('qualeno-theme', theme)
  }, [theme])

  useEffect(() => {
    const query = tickerInput.trim()
    if (query.length < 1) {
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/tickers/suggest?q=${encodeURIComponent(query)}`)
        if (!response.ok) return
        const data = (await response.json()) as TickerSuggestion[]
        setSuggestions(data)
      } catch {
        setSuggestions([])
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [tickerInput])

  async function executeSearch(rawTicker: string) {
    const nextTicker = rawTicker.toUpperCase().trim()
    if (!nextTicker) return

    setIsLoading(true)
    setShowSuggestions(false)
    try {
      const response = await fetch(`/api/fundamentals?ticker=${encodeURIComponent(nextTicker)}`)
      if (!response.ok) return

      const data = (await response.json()) as TickerResponse
      setCurrentData(data)
      setTickerInput(data.ticker)
      window.history.replaceState({}, '', `/ticker/${encodeURIComponent(data.ticker)}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await executeSearch(tickerInput)
  }

  return (
    <>
      <Header theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />
      <main className="mx-auto min-h-screen max-w-400 px-2 py-8 sm:px-4">
      <header className="mb-8 bg-white p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              aria-label="Back to homepage"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-100"
              title="Back to homepage"
            >
              ←
            </a>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden">
              <img
                src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(currentData.ticker)}.png`}
                alt={`${currentData.ticker} logo`}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{currentData.companyName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase text-slate-900 font-semibold">{currentData.ticker}</p>
                {currentData.industry && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                    {currentData.industry}
                  </span>
                )}
                {currentData.category && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    {currentData.category}
                  </span>
                )}
                {currentData.location && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                    {currentData.exchange}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
              <p className="text-2xl font-semibold text-slate-900">
                {latestPrice > 0 ? `${latestPrice.toFixed(2)} ${currentData.currency}` : '--'}
              </p>
              <p className={`text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                {latestPrice > 0
                  ? `${isPositiveChange ? '+' : ''}${dayChange.toFixed(2)} (${isPositiveChange ? '+' : ''}${dayChangePct.toFixed(2)}%) 24h`
                : '--'}
              </p>
          </div>
        </div>

        <form onSubmit={onSearch} className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="relative w-full">
            <input
              value={tickerInput}
              onChange={(event) => {
                const nextValue = event.target.value
                setTickerInput(nextValue)
                if (nextValue.trim().length < 1) {
                  setSuggestions([])
                }
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search ticker: AAPL, MSFT, NVDA"
              aria-label="Ticker symbol"
              autoComplete="off"
              className={`w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none ring-cyan-400/70 transition focus:ring ${isLoading ? 'pr-10' : ''}`}
            />
            {isLoading && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden="true">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
              </span>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.symbol}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
                      onClick={() => executeSearch(suggestion.symbol)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                          <img
                            src={suggestion.logoUrl}
                            alt={`${suggestion.symbol} logo`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                        <span className="font-medium">{suggestion.symbol}</span>
                      </div>
                      <span className="truncate text-xs text-slate-500">{suggestion.companyName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </div>
        </form>
      </header>

      {currentData.error && (
        <section className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-black">
          {currentData.error}
        </section>
      )}

      {reportPeriod === 'annual' && activeReports.length === 0 && (
        <section className="mb-6 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sky-900">
          No annual data available for this ticker yet. Run ticker sync to populate annual fundamentals.
        </section>
      )}

      {hasData && (
        <FundamentalsCharts chartData={chartData} priceData={priceData} currency={currentData.currency} />
      )}

      <footer className="mt-8 text-xs text-slate-500">© 2026 Qualeno. All rights reserved.</footer>
      </main>
    </>
  )
}

function formatQuarterLabel(fiscalDateEnding: string): string {
  const [year, month] = fiscalDateEnding.split('-')
  const monthNumber = Number(month)
  const quarter = Math.min(4, Math.max(1, Math.ceil(monthNumber / 3)))
  const shortYear = year.slice(-2)
  return `Q${quarter} ${shortYear}`
}

function formatDailyLabel(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function formatAnnualLabel(fiscalDateEnding: string): string {
  return fiscalDateEnding.slice(0, 4)
}
