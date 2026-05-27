import { createClient } from '@supabase/supabase-js'
import type { DailyPricePoint, QuarterlyReport, ReportPeriod, TickerResponse } from '../types'

type FinancialDatasetsEarningsResponse = {
  earnings?: Array<{
    report_period?: string
    reportPeriod?: string
    fiscal_date_ending?: string
    quarterly?: {
      total_debt: number
      cash_and_equivalents: number
      free_cash_flow: number
    }
  }>
}

type FinancialDatasetsIncomeResponse = {
  income_statements?: Array<{
    report_period: string
    currency?: string
    revenue?: number
    net_income?: number
    operating_expense?: number
    ebit?: number
    earnings_per_share?: number
    diluted_earnings_per_share?: number
    diluted_eps?: number
    shares_outstanding?: number
    weighted_average_shares?: number
    weighted_average_shares_diluted?: number
    dividends_per_common_share?: number
  }>
  incomeStatements?: Array<{
    report_period?: string
    reportPeriod?: string
    fiscal_date_ending?: string
    currency?: string
    revenue?: number
    total_revenue?: number
    net_income?: number
    operating_expense?: number
    ebit?: number
    earnings_per_share?: number
    diluted_earnings_per_share?: number
    diluted_eps?: number
    shares_outstanding?: number
    weighted_average_shares?: number
    weighted_average_shares_diluted?: number
    dividends_per_common_share?: number
  }>
}

type FinancialDatasetsCashFlowResponse = {
  cash_flow_statements?: Array<{
    report_period: string
    free_cash_flow?: number
  }>
  cashFlowStatements?: Array<{
    report_period?: string
    reportPeriod?: string
    fiscal_date_ending?: string
    free_cash_flow?: number
  }>
}

type FinancialDatasetsBalanceSheetResponse = {
  balance_sheets?: Array<{
    report_period: string
    cash_and_equivalents?: number
    total_debt?: number
    shares_outstanding?: number
    outstanding_shares?: number
  }>
  balanceSheets?: Array<{
    report_period?: string
    reportPeriod?: string
    fiscal_date_ending?: string
    cash_and_equivalents?: number
    total_debt?: number
    shares_outstanding?: number
    outstanding_shares?: number
  }>
}

type FinancialDatasetsCompanyResponse = {
  company_facts?: {
    ticker?: string
    name?: string
    sector?: string
    industry?: string
    category?: string
    exchange?: string
    location?: string
  }
}

type AlphaVantageDailyResponse = {
  'Meta Data'?: {
    '3. Last Refreshed'?: string
  }
  'Time Series (Daily)'?: Record<
    string,
    {
      '4. close'?: string
    }
  >
  'Error Message'?: string
  Note?: string
}

type FinancialDatasetsPricesResponse = {
  prices?: Array<{
    time?: string
    date?: string
    close?: number
    close_price?: number
  }>
}

type DbQuarterlyRow = {
  fiscal_date_ending: string
  period_type?: ReportPeriod | null
  total_revenue: number | string | null
  net_income: number | string | null
  reported_eps: number | string | null
  expenses: number | string | null
  ebitda: number | string | null
  free_cash_flow: number | string | null
  cash: number | string | null
  debt: number | string | null
  shares_outstanding: number | string | null
  dividends_per_share: number | string | null
}

type DbPriceRow = {
  trading_date: string
  close_price: number | string | null
}

export type TickerSuggestion = {
  symbol: string
  companyName: string
  logoUrl: string
}

export type FundamentalsCompany = {
  symbol: string
  companyName: string
  sector?: string
  industry?: string
  logoUrl: string
  latestPrice?: number
  dayChange?: number
  dayChangePct?: number
}

const CACHE_TTL_HOURS = Number(process.env.SUPABASE_CACHE_TTL_HOURS ?? 24)
const FINANCIAL_DATASETS_API_KEY = process.env.FINANCIAL_DATASETS_API_KEY
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID
const GOOGLE_SHEET_COMPANY_TAB = process.env.GOOGLE_SHEET_COMPANY_TAB ?? 'Company'
const GOOGLE_SHEET_QUARTERLY_TAB = process.env.GOOGLE_SHEET_QUARTERLY_TAB ?? 'Quarterly'
const GOOGLE_SHEET_ANNUAL_TAB = process.env.GOOGLE_SHEET_ANNUAL_TAB ?? 'Annual'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null

if (!supabase) {
  console.warn('[stockApi] Supabase is not configured. Data will not be persisted to DB.')
}
if (!FINANCIAL_DATASETS_API_KEY) {
  console.warn('[stockApi] FINANCIAL_DATASETS_API_KEY is missing. Financial Datasets fallback is disabled.')
}
if (!ALPHA_VANTAGE_API_KEY) {
  console.warn('[stockApi] ALPHA_VANTAGE_API_KEY is missing. Price sync will fallback to Financial Datasets.')
}
if (!GOOGLE_SHEET_ID) {
  console.warn('[stockApi] GOOGLE_SHEET_ID is missing. Google Sheets fundamentals sync is disabled.')
}

export async function loadTickerData(rawTicker: string): Promise<TickerResponse> {
  const ticker = rawTicker.toUpperCase().trim()

  const dbData = await loadTickerDataFromNormalizedDb(ticker)
  if (dbData) {
    return dbData
  }

  return {
    ticker,
    companyName: ticker,
    currency: 'USD',
    source: 'Supabase Cache',
    reports: [],
    quarterlyReports: [],
    annualReports: [],
    priceHistory: [],
    error: `Ticker ${ticker} is not available in the database yet. Run the sync command first.`,
  }
}

export async function loadTickerDataBatch(tickers: string[]): Promise<TickerResponse[]> {
  const normalized = Array.from(
    new Set(tickers.map((ticker) => ticker.toUpperCase().trim()).filter(Boolean)),
  )
  return Promise.all(normalized.map((ticker) => loadTickerData(ticker)))
}

export async function syncTicker(rawTicker: string): Promise<TickerResponse> {
  const ticker = rawTicker.toUpperCase().trim()
  const fresh = await loadTickerDataFromGoogleSheets(ticker)

  if (!fresh) {
    throw new Error(`[${ticker}] Sync failed: no data from Google Sheets/price source`)
  }

  await saveTickerDataToNormalizedDb(fresh)
  return fresh
}

export async function listSheetTickers(): Promise<string[]> {
  if (!GOOGLE_SHEET_ID) {
    return []
  }

  try {
    const quarterlyRows = await loadGoogleSheetRowsSafe(GOOGLE_SHEET_QUARTERLY_TAB)

    const tickers = quarterlyRows
      .map((row) => getTickerField(row, ['symbol', 'ticker']))
      .filter(Boolean)

    return Array.from(new Set(tickers)).sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('[stockApi] Failed loading tickers from Google Sheets:', error)
    return []
  }
}

export async function searchTickerSuggestions(query: string): Promise<TickerSuggestion[]> {
  if (!supabase) {
    return []
  }

  const normalized = query.trim().toUpperCase()
  if (normalized.length < 1) {
    return []
  }

  const { data, error } = await supabase
    .from('tickers')
    .select('symbol, company_name')
    .or(`symbol.ilike.${normalized}%,company_name.ilike.%${normalized}%`)
    .order('symbol', { ascending: true })
    .limit(8)

  if (error || !data) {
    if (error) {
      console.error('[stockApi] Failed searching ticker suggestions:', error.message)
    }
    return []
  }

  return data.map((row: { symbol: string; company_name: string | null }) => ({
    symbol: row.symbol,
    companyName: row.company_name ?? row.symbol,
    logoUrl: getTickerLogoUrl(row.symbol),
    test: 'test',
  }))
}

export async function listCompaniesWithFundamentals(): Promise<FundamentalsCompany[]> {
  if (!supabase) {
    return []
  }

  const { data: fundamentalsRows, error: fundamentalsErr } = await supabase
    .from('quarterly_fundamentals')
    .select('ticker_id')

  if (fundamentalsErr || !fundamentalsRows) {
    return []
  }

  const tickerIds = Array.from(
    new Set(
      fundamentalsRows
        .map((row: { ticker_id: string | null }) => row.ticker_id)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  if (tickerIds.length === 0) {
    return []
  }

  const { data: tickerRows, error: tickerErr } = await supabase
    .from('tickers')
    .select('id, symbol, company_name, sector, industry')
    .in('id', tickerIds)
    .order('symbol', { ascending: true })

  if (tickerErr || !tickerRows) {
    return []
  }

  const tickerIdBySymbol = new Map(
    tickerRows.map((row: { id: string; symbol: string }) => [row.symbol, row.id]),
  )

  const { data: pricesRows } = await supabase
    .from('daily_prices')
    .select('ticker_id, trading_date, close_price')
    .in('ticker_id', tickerIds)
    .order('ticker_id', { ascending: true })
    .order('trading_date', { ascending: false })

  const priceByTickerId = new Map<string, { latest?: number; previous?: number }>()
  for (const row of pricesRows ?? []) {
    const tickerId = (row as { ticker_id: string }).ticker_id
    const close = Number((row as { close_price: number | string | null }).close_price ?? 0)
    if (!Number.isFinite(close) || close <= 0) continue
    const existing = priceByTickerId.get(tickerId)
    if (!existing) {
      priceByTickerId.set(tickerId, { latest: close })
      continue
    }
    if (existing.previous === undefined) {
      existing.previous = close
      priceByTickerId.set(tickerId, existing)
    }
  }

  return tickerRows.map(
    (row: { id: string; symbol: string; company_name: string | null; sector: string | null; industry: string | null }) => {
      const tickerId = tickerIdBySymbol.get(row.symbol)
      const price = tickerId ? priceByTickerId.get(tickerId) : undefined
      const latestPrice = price?.latest
      const previousPrice = price?.previous ?? latestPrice
      const dayChange =
        latestPrice !== undefined && previousPrice !== undefined ? latestPrice - previousPrice : undefined
      const dayChangePct =
        dayChange !== undefined && previousPrice !== undefined && previousPrice !== 0
          ? (dayChange / previousPrice) * 100
          : undefined

      return {
      symbol: row.symbol,
      companyName: row.company_name ?? row.symbol,
      sector: row.sector ?? undefined,
      industry: row.industry ?? undefined,
      logoUrl: getTickerLogoUrl(row.symbol),
      latestPrice,
      dayChange,
      dayChangePct,
      }
    },
  )
}

function getTickerLogoUrl(symbol: string): string {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`
}

async function loadTickerDataFromNormalizedDb(ticker: string): Promise<TickerResponse | null> {
  if (!supabase) {
    return null
  }

  const { data: tickerRow, error: tickerErr } = await supabase
    .from('tickers')
    .select('id, symbol, company_name, sector, industry, category, exchange, location, currency, source')
    .eq('symbol', ticker)
    .maybeSingle()

  if (tickerErr || !tickerRow) {
    return null
  }

  const { data: refreshRow } = await supabase
    .from('ticker_refresh_log')
    .select('refreshed_at')
    .eq('ticker_id', tickerRow.id)
    .order('refreshed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const refreshedAt = refreshRow?.refreshed_at ? new Date(refreshRow.refreshed_at).getTime() : NaN
  const isExpired = Number.isNaN(refreshedAt)
    ? true
    : Date.now() - refreshedAt > CACHE_TTL_HOURS * 60 * 60 * 1000

  if (isExpired) {
    return null
  }

  const [{ data: reportsRows, error: reportsErr }, { data: pricesRows, error: pricesErr }] =
    await Promise.all([
      supabase
        .from('quarterly_fundamentals')
        .select('*')
        .eq('ticker_id', tickerRow.id)
        .order('fiscal_date_ending', { ascending: false })
        .limit(64),
      supabase
        .from('daily_prices')
        .select('trading_date, close_price')
        .eq('ticker_id', tickerRow.id)
        .order('trading_date', { ascending: false })
        .limit(252),
    ])

  if (reportsErr || pricesErr) {
    return null
  }

  const toReport = (row: DbQuarterlyRow): QuarterlyReport => ({
    fiscalDateEnding: row.fiscal_date_ending,
    totalRevenue: Number(row.total_revenue ?? 0),
    netIncome: Number(row.net_income ?? 0),
    reportedEPS: Number(row.reported_eps ?? 0),
    expenses: Number(row.expenses ?? 0),
    ebitda: Number(row.ebitda ?? 0),
    freeCashFlow: Number(row.free_cash_flow ?? 0),
    cash: Number(row.cash ?? 0),
    debt: Number(row.debt ?? 0),
    sharesOutstanding: Number(row.shares_outstanding ?? 0),
    dividendsPerShare: Number(row.dividends_per_share ?? 0),
  })

  const quarterlyReports: QuarterlyReport[] = (reportsRows ?? [])
    .filter((row: DbQuarterlyRow) => (row.period_type ?? 'quarterly') === 'quarterly')
    .slice()
    .reverse()
    .map(toReport)

  const annualReports: QuarterlyReport[] = (reportsRows ?? [])
    .filter((row: DbQuarterlyRow) => row.period_type === 'annual')
    .slice()
    .reverse()
    .map(toReport)

  const dedupedQuarterlyReports = dedupeReports(quarterlyReports).slice(-16)
  const dedupedAnnualReports = dedupeReports(annualReports)
  const reports = dedupedQuarterlyReports

  const priceHistory = dedupePrices(
    (pricesRows ?? [])
    .slice()
    .reverse()
    .map((row: DbPriceRow) => ({
      date: row.trading_date,
      close: Number(row.close_price ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date)),
  )

  if (dedupedQuarterlyReports.length === 0) {
    return null
  }

  return {
    ticker: tickerRow.symbol,
    companyName: tickerRow.company_name ?? tickerRow.symbol,
    sector: tickerRow.sector ?? undefined,
    industry: tickerRow.industry ?? undefined,
    category: tickerRow.category ?? undefined,
    exchange: tickerRow.exchange ?? undefined,
    location: tickerRow.location ?? undefined,
    currency: tickerRow.currency ?? 'USD',
    source: 'Supabase Cache',
    reports,
    quarterlyReports: dedupedQuarterlyReports,
    annualReports: dedupedAnnualReports,
    priceHistory,
  }
}

async function saveTickerDataToNormalizedDb(payload: TickerResponse): Promise<void> {
  if (!supabase) {
    return
  }

  const { error: upsertTickerErr } = await supabase
    .from('tickers')
    .upsert(
      {
        symbol: payload.ticker,
        company_name: payload.companyName,
        sector: payload.sector,
        industry: payload.industry,
        category: payload.category,
        exchange: payload.exchange,
        location: payload.location,
        currency: payload.currency,
        source: payload.source,
      },
      { onConflict: 'symbol' },
    )

  if (upsertTickerErr) {
    console.error('[stockApi] Failed upserting ticker:', upsertTickerErr.message)
    return
  }

  const { data: tickerRow, error: tickerErr } = await supabase
    .from('tickers')
    .select('id')
    .eq('symbol', payload.ticker)
    .maybeSingle()

  if (tickerErr || !tickerRow) {
    return
  }

  const tickerId = tickerRow.id as string

  const allReports = dedupeReportEntries([
    ...payload.quarterlyReports.map((report) => ({ ...report, periodType: 'quarterly' as const })),
    ...payload.annualReports.map((report) => ({ ...report, periodType: 'annual' as const })),
  ])

  if (allReports.length > 0) {
    const { error: fundamentalsUpsertErr } = await supabase.from('quarterly_fundamentals').upsert(
      allReports.map((report) => ({
        ticker_id: tickerId,
        fiscal_date_ending: report.fiscalDateEnding,
        period_type: report.periodType,
        total_revenue: report.totalRevenue,
        net_income: report.netIncome,
        reported_eps: report.reportedEPS,
        expenses: report.expenses,
        ebitda: report.ebitda,
        free_cash_flow: report.freeCashFlow,
        cash: report.cash,
        debt: report.debt,
        shares_outstanding: report.sharesOutstanding,
        dividends_per_share: report.dividendsPerShare,
      })),
      { onConflict: 'ticker_id,period_type,fiscal_date_ending' },
    )
    if (fundamentalsUpsertErr) {
      console.error('[stockApi] Failed upserting fundamentals:', fundamentalsUpsertErr.message)
    }
  }

  if (payload.priceHistory.length > 0) {
    const dedupedPrices = dedupePrices(payload.priceHistory)
    await supabase.from('daily_prices').upsert(
      dedupedPrices.map((point) => ({
        ticker_id: tickerId,
        trading_date: point.date,
        close_price: point.close,
      })),
      { onConflict: 'ticker_id,trading_date' },
    )
  }

  await supabase.from('ticker_refresh_log').insert({
    ticker_id: tickerId,
    status: payload.error ? 'partial' : 'success',
    note: payload.error ?? null,
  })
}

async function loadTickerDataFromGoogleSheets(ticker: string): Promise<TickerResponse | null> {
  if (!GOOGLE_SHEET_ID) {
    return null
  }

  try {
    const companyRows = await loadGoogleSheetRowsSafe(GOOGLE_SHEET_COMPANY_TAB)
    const quarterlyRows = await loadGoogleSheetRowsSafe(GOOGLE_SHEET_QUARTERLY_TAB)
    const annualRows = await loadGoogleSheetRowsSafe(GOOGLE_SHEET_ANNUAL_TAB)

    const companyRow =
      companyRows.find((row) => getTickerField(row, ['symbol', 'ticker']) === ticker) ?? null
    if (!companyRow) {
      console.warn(`[${ticker}] No matching row found in "${GOOGLE_SHEET_COMPANY_TAB}" tab.`)
    }
    const quarterlyReports = quarterlyRows
      .filter((row) => getTickerField(row, ['symbol', 'ticker']) === ticker)
      .map((row) => mapSheetRowToReport(row))
      .filter((row): row is QuarterlyReport => row !== null)
      .sort((a, b) => a.fiscalDateEnding.localeCompare(b.fiscalDateEnding))
    const annualReports = annualRows
      .filter((row) => getTickerField(row, ['symbol', 'ticker']) === ticker)
      .map((row) => mapSheetRowToReport(row))
      .filter((row): row is QuarterlyReport => row !== null)
      .sort((a, b) => a.fiscalDateEnding.localeCompare(b.fiscalDateEnding))

    const priceHistory = await loadDailyPricesFromAlphaVantage(ticker)
    const resolvedPriceHistory =
      priceHistory.length > 0 && priceHistory.at(-1)?.close
        ? priceHistory
        : FINANCIAL_DATASETS_API_KEY
          ? await loadDailyPricesFromFinancialDatasets(ticker, { 'X-API-KEY': FINANCIAL_DATASETS_API_KEY })
          : []

    const hasQuarterlyFundamentals = quarterlyReports.length > 0
    if (!hasQuarterlyFundamentals) {
      console.warn(
        `[${ticker}] No quarterly rows found in "${GOOGLE_SHEET_QUARTERLY_TAB}" tab. Sync will update company + price only.`,
      )
    }

    if (resolvedPriceHistory.length === 0) {
      console.warn(
        `[${ticker}] No price rows loaded from Alpha Vantage${FINANCIAL_DATASETS_API_KEY ? ' or Financial Datasets fallback' : ''}. Continuing with fundamentals-only sync.`,
      )
    }

    const companyName =
      getOptionalStringField(companyRow, [
        'companyname',
        'company_name',
        'company',
        'name',
        'longname',
      ]) || ticker
    const currency = getOptionalStringField(companyRow, ['currency']) || 'USD'

    return {
      ticker,
      companyName,
      sector: getOptionalStringField(companyRow, ['sector', 'gicssector', 'marketsector']),
      industry: getOptionalStringField(companyRow, ['industry', 'gicsindustry', 'subindustry']),
      category: getOptionalStringField(companyRow, ['category', 'assettype', 'type']),
      exchange: getOptionalStringField(companyRow, ['exchange', 'exchangename', 'mic']),
      location: getOptionalStringField(companyRow, ['location', 'headquarters', 'hq', 'country', 'city']),
      currency,
      source: 'Google Sheets + Alpha Vantage',
      reports: hasQuarterlyFundamentals ? quarterlyReports : [],
      quarterlyReports: hasQuarterlyFundamentals ? quarterlyReports : [],
      annualReports: hasQuarterlyFundamentals ? annualReports : [],
      priceHistory: resolvedPriceHistory,
      error: hasQuarterlyFundamentals
        ? undefined
        : `No quarterly fundamentals found for ${ticker} in ${GOOGLE_SHEET_QUARTERLY_TAB} tab.`,
    }
  } catch (error) {
    console.error(`[${ticker}] Google Sheets sync failed:`, error)
    return null
  }
}

async function loadTickerDataFromFinancialDatasets(
  ticker: string,
): Promise<TickerResponse | null> {
  if (!FINANCIAL_DATASETS_API_KEY) {
    return null
  }

  try {
    const headers = { 'X-API-KEY': FINANCIAL_DATASETS_API_KEY }
    const quarterlyQuery = `ticker=${encodeURIComponent(ticker)}&period=quarterly&limit=16`
    const annualQuery = `ticker=${encodeURIComponent(ticker)}&period=annual&limit=20`

    const [
      quarterlyEarningsRes,
      quarterlyIncomeRes,
      quarterlyCashFlowRes,
      quarterlyBalanceRes,
      annualEarningsRes,
      annualIncomeRes,
      annualCashFlowRes,
      annualBalanceRes,
      companyRes,
    ] = await Promise.all([
      fetch(`https://api.financialdatasets.ai/financials/earnings?${quarterlyQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/income-statements?${quarterlyQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/cash-flow-statements?${quarterlyQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/balance-sheets?${quarterlyQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/earnings?${annualQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/income-statements?${annualQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/cash-flow-statements?${annualQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/financials/balance-sheets?${annualQuery}`, { headers }),
      fetch(`https://api.financialdatasets.ai/company/facts?ticker=${encodeURIComponent(ticker)}`, {
        headers,
      }),
    ])

    if (
      !quarterlyIncomeRes.ok ||
      !quarterlyCashFlowRes.ok ||
      !quarterlyBalanceRes.ok ||
      !annualIncomeRes.ok ||
      !annualCashFlowRes.ok ||
      !annualBalanceRes.ok
    ) {
      return null
    }

    const [
      quarterlyEarningsJson,
      quarterlyIncomeJson,
      quarterlyCashFlowJson,
      quarterlyBalanceJson,
      annualEarningsJson,
      annualIncomeJson,
      annualCashFlowJson,
      annualBalanceJson,
      companyJson,
    ] = await Promise.all([
      quarterlyEarningsRes.json() as Promise<FinancialDatasetsEarningsResponse>,
      quarterlyIncomeRes.json() as Promise<FinancialDatasetsIncomeResponse>,
      quarterlyCashFlowRes.json() as Promise<FinancialDatasetsCashFlowResponse>,
      quarterlyBalanceRes.json() as Promise<FinancialDatasetsBalanceSheetResponse>,
      annualEarningsRes.json() as Promise<FinancialDatasetsEarningsResponse>,
      annualIncomeRes.json() as Promise<FinancialDatasetsIncomeResponse>,
      annualCashFlowRes.json() as Promise<FinancialDatasetsCashFlowResponse>,
      annualBalanceRes.json() as Promise<FinancialDatasetsBalanceSheetResponse>,
      companyRes.json() as Promise<FinancialDatasetsCompanyResponse>,
    ])

    const quarterlyReports = mapFinancialReports({
      earningsJson: quarterlyEarningsJson,
      incomeJson: quarterlyIncomeJson,
      cashFlowJson: quarterlyCashFlowJson,
      balanceJson: quarterlyBalanceJson,
    })
    const annualReports = mapFinancialReports({
      earningsJson: annualEarningsJson,
      incomeJson: annualIncomeJson,
      cashFlowJson: annualCashFlowJson,
      balanceJson: annualBalanceJson,
    })
    const reports = quarterlyReports

    const priceHistory = await loadDailyPricesFromAlphaVantage(ticker)
    console.log(`[${ticker}] Loaded ${priceHistory.length} daily price points from Alpha Vantage`)
    const resolvedPriceHistory =
      priceHistory.length > 0 ? priceHistory : await loadDailyPricesFromFinancialDatasets(ticker, headers)

    if (quarterlyReports.length === 0 || resolvedPriceHistory.length === 0) {
      return null
    }
    const company = companyJson?.company_facts

    return {
      ticker,
      companyName: company?.name ?? ticker,
      sector: company?.sector,
      industry: company?.industry,
      category: company?.category,
      exchange: company?.exchange,
      location: company?.location,
      currency:
        quarterlyIncomeJson.income_statements?.[0]?.currency ??
        quarterlyIncomeJson.incomeStatements?.[0]?.currency ??
        annualIncomeJson.income_statements?.[0]?.currency ??
        annualIncomeJson.incomeStatements?.[0]?.currency ??
        'USD',
      source: 'Financial Datasets',
      reports,
      quarterlyReports,
      annualReports,
      priceHistory: resolvedPriceHistory,
    }
  } catch {
    return null
  }
}

type SheetRow = Record<string, string>

async function loadGoogleSheetRows(tabName: string): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(GOOGLE_SHEET_ID ?? '')}/gviz/tq?sheet=${encodeURIComponent(tabName)}&tqx=out:json`
  const response = await fetch(url)
  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(
      `Failed loading sheet tab "${tabName}" (HTTP ${response.status}). ${details.slice(0, 180)}`,
    )
  }

  const body = await response.text()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end < 0) {
    return []
  }
  const payload = JSON.parse(body.slice(start, end + 1)) as {
    table?: { cols?: Array<{ label?: string }>; rows?: Array<{ c?: Array<{ v?: unknown }> }> }
  }

  const cols = payload.table?.cols ?? []
  const rows = payload.table?.rows ?? []
  let headers = cols.map((col) => normalizeKey(col.label ?? ''))
  let dataRows = rows

  // Some sheets/gviz responses expose empty labels; in that case, treat first row as header.
  if (headers.every((h) => h.length === 0) && rows.length > 0) {
    const firstRow = rows[0]?.c ?? []
    headers = firstRow.map((cell) => normalizeKey(normalizeCellValue(cell?.v)))
    dataRows = rows.slice(1)
  }

  const mapped = dataRows
    .map((row) => row.c ?? [])
    .map((cells) => {
      const out: SheetRow = {}
      headers.forEach((header, idx) => {
        const value = normalizeCellValue(cells[idx]?.v)
        if (header) out[header] = value
      })
      return out
    })
    .filter((row) => Object.values(row).some((v) => v.length > 0))

  return mapped
}

async function loadGoogleSheetRowsSafe(tabName: string): Promise<SheetRow[]> {
  try {
    return await loadGoogleSheetRows(tabName)
  } catch (error) {
    console.error(`[stockApi] Failed loading sheet tab "${tabName}":`, error)
    return []
  }
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const dateExpr = value.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/)
    if (dateExpr) {
      const year = Number(dateExpr[1])
      const month = Number(dateExpr[2]) + 1
      const day = Number(dateExpr[3])
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return value.trim()
  }
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getTickerField(row: SheetRow | null, aliases: string[]): string {
  if (!row) return ''
  for (const alias of aliases) {
    const key = normalizeKey(alias)
    const value = row[key]
    if (value && value.trim().length > 0) {
      return value.trim().toUpperCase()
    }
  }
  return ''
}

function getOptionalStringField(row: SheetRow | null, aliases: string[]): string | undefined {
  if (!row) return undefined
  for (const alias of aliases) {
    const key = normalizeKey(alias)
    const value = row[key]
    if (value && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function getNumberField(row: SheetRow, aliases: string[]): number {
  for (const alias of aliases) {
    const key = normalizeKey(alias)
    const raw = row[key]
    if (!raw) continue
    const normalized = raw.replace(/[$,%\s,]/g, '')
    const n = Number(normalized)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function mapSheetRowToReport(row: SheetRow): QuarterlyReport | null {
  const fiscalDateEnding =
    getOptionalStringField(row, ['fiscalDateEnding', 'fiscal_date_ending', 'date', 'period']) ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fiscalDateEnding)) {
    return null
  }

  return {
    fiscalDateEnding,
    totalRevenue: getNumberField(row, ['totalRevenue', 'revenue', 'total_revenue']),
    netIncome: getNumberField(row, ['netIncome', 'net_income']),
    reportedEPS: getNumberField(row, ['reportedEPS', 'eps', 'dilutedEPS', 'diluted_eps']),
    expenses: getNumberField(row, ['expenses', 'operatingExpense', 'operating_expense']),
    ebitda: getNumberField(row, ['ebitda', 'ebit']),
    freeCashFlow: getNumberField(row, ['freeCashFlow', 'free_cash_flow', 'fcf']),
    cash: getNumberField(row, ['cash', 'cashAndEquivalents', 'cash_and_equivalents']),
    debt: getNumberField(row, ['debt', 'totalDebt', 'total_debt']),
    sharesOutstanding: getNumberField(row, ['sharesOutstanding', 'shares_outstanding', 'outstanding_shares']),
    dividendsPerShare: getNumberField(row, [
      'dividendsPerShare',
      'dividends_per_share',
      'dividendPerShare',
      'dps',
      'dividends_per_common_share',
      'dividendsPerCommonShare',
      'dividentsPerShare',
      'dividents_per_share',
      'dividentPerShare',
    ]),
  }
}

async function loadDailyPricesFromAlphaVantage(ticker: string): Promise<DailyPricePoint[]> {
  if (!ALPHA_VANTAGE_API_KEY) {
    return []
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`
  const response = await fetch(url)
  if (!response.ok) {
    return []
  }

  const json = (await response.json()) as AlphaVantageDailyResponse
  const series = json['Time Series (Daily)']
  if (!series) {
    return []
  }
  const lastRefreshed = (json['Meta Data']?.['3. Last Refreshed'] ?? '').slice(0, 10)

  return Object.entries(series)
    .map(([date, point]) => ({
      date,
      close: Number(point['4. close'] ?? 0),
    }))
    .filter(
      (row) =>
        /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        Number.isFinite(row.close) &&
        row.close > 0 &&
        (lastRefreshed ? row.date <= lastRefreshed : true),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-252)
}

async function loadDailyPricesFromFinancialDatasets(
  ticker: string,
  headers: { 'X-API-KEY': string },
): Promise<DailyPricePoint[]> {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setFullYear(today.getFullYear() - 3)
  const priceQuery = `ticker=${encodeURIComponent(ticker)}&interval=day&start_date=${startDate
    .toISOString()
    .slice(0, 10)}&end_date=${today.toISOString().slice(0, 10)}`

  const response = await fetch(`https://api.financialdatasets.ai/prices?${priceQuery}`, { headers })
  if (!response.ok) {
    return []
  }
  const pricesJson = (await response.json()) as FinancialDatasetsPricesResponse
  return (pricesJson.prices ?? [])
    .map((row) => ({
      date: String(row.time ?? row.date ?? '').slice(0, 10),
      close: Number(row.close ?? row.close_price ?? 0),
    }))
    .filter((row) => row.date.length > 0 && row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-252)
}

function mapFinancialReports(args: {
  earningsJson: FinancialDatasetsEarningsResponse
  incomeJson: FinancialDatasetsIncomeResponse
  cashFlowJson: FinancialDatasetsCashFlowResponse
  balanceJson: FinancialDatasetsBalanceSheetResponse
}): QuarterlyReport[] {
  const normalizePeriod = (value: string | undefined): string | null => {
    if (!value) return null
    const normalized = value.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
  }

  const cashFlowRows = args.cashFlowJson.cash_flow_statements ?? args.cashFlowJson.cashFlowStatements ?? []
  const balanceRows = args.balanceJson.balance_sheets ?? args.balanceJson.balanceSheets ?? []
  const incomeRows = args.incomeJson.income_statements ?? args.incomeJson.incomeStatements ?? []
  const earningsRows = args.earningsJson.earnings ?? []

  const earningsCashByPeriod = new Map(
    earningsRows
      .map((row) => ({
        reportPeriod: normalizePeriod(row.report_period ?? row.reportPeriod ?? row.fiscal_date_ending),
        freeCashFlow: Number(row.quarterly?.free_cash_flow ?? 0),
      }))
      .filter((row) => Boolean(row.reportPeriod))
      .map((row) => [row.reportPeriod as string, row.freeCashFlow]),
  )

  const cashByPeriod = new Map(
    cashFlowRows
      .map((row) => ({
        reportPeriod: normalizePeriod(row.report_period ?? row.reportPeriod ?? row.fiscal_date_ending),
        freeCashFlow: Number(row.free_cash_flow ?? 0),
      }))
      .filter((row) => Boolean(row.reportPeriod))
      .map((row) => [row.reportPeriod as string, { freeCashFlow: row.freeCashFlow }]),
  )

  const balanceByPeriod = new Map(
    balanceRows
      .map((row) => ({
        reportPeriod: normalizePeriod(row.report_period ?? row.reportPeriod ?? row.fiscal_date_ending),
        cash: Number(row.cash_and_equivalents ?? 0),
        debt: Number(row.total_debt ?? 0),
        sharesOutstanding: Number(row.outstanding_shares ?? row.shares_outstanding ?? 0),
      }))
      .filter((row) => Boolean(row.reportPeriod))
      .map((row) => [
        row.reportPeriod as string,
        {
          cash: row.cash,
          debt: row.debt,
          sharesOutstanding: row.sharesOutstanding,
        },
      ]),
  )

  return incomeRows
    .slice()
    .reverse()
    .map((row) => {
      const reportPeriod = normalizePeriod(row.report_period ?? row.reportPeriod ?? row.fiscal_date_ending)
      const cashFlowValue = Number(cashByPeriod.get(reportPeriod ?? '')?.freeCashFlow ?? NaN)
      const earningsCashValue = Number(earningsCashByPeriod.get(reportPeriod ?? '') ?? NaN)
      const freeCashFlow = Number.isFinite(cashFlowValue)
        ? cashFlowValue
        : Number.isFinite(earningsCashValue)
          ? earningsCashValue
          : 0

      return {
        fiscalDateEnding: reportPeriod ?? '',
        totalRevenue: Number(row.revenue ?? row.total_revenue ?? 0),
        netIncome: Number(row.net_income ?? 0),
        reportedEPS: Number(row.diluted_earnings_per_share ?? row.diluted_eps ?? row.earnings_per_share ?? 0),
        expenses: Number(row.operating_expense ?? 0),
        ebitda: Number(row.ebit ?? 0),
        freeCashFlow,
        cash: Number(balanceByPeriod.get(reportPeriod ?? '')?.cash ?? 0),
        debt: Number(balanceByPeriod.get(reportPeriod ?? '')?.debt ?? 0),
        sharesOutstanding: Number(
          balanceByPeriod.get(reportPeriod ?? '')?.sharesOutstanding ??
            row.outstanding_shares ??
            row.shares_outstanding ??
            row.weighted_average_shares_diluted ??
            row.weighted_average_shares ??
            0,
        ),
        dividendsPerShare: Number(row.dividends_per_common_share ?? 0),
      }
    })
    .filter((row) => row.fiscalDateEnding.length > 0)
}

function dedupeReports(reports: QuarterlyReport[]): QuarterlyReport[] {
  const byDate = new Map<string, QuarterlyReport>()
  for (const report of reports) {
    byDate.set(report.fiscalDateEnding, report)
  }
  return Array.from(byDate.values()).sort((a, b) => a.fiscalDateEnding.localeCompare(b.fiscalDateEnding))
}

function dedupeReportEntries(
  reports: Array<QuarterlyReport & { periodType: 'quarterly' | 'annual' }>,
): Array<QuarterlyReport & { periodType: 'quarterly' | 'annual' }> {
  const byKey = new Map<string, QuarterlyReport & { periodType: 'quarterly' | 'annual' }>()
  for (const report of reports) {
    byKey.set(`${report.periodType}:${report.fiscalDateEnding}`, report)
  }
  return Array.from(byKey.values())
}

function dedupePrices(prices: DailyPricePoint[]): DailyPricePoint[] {
  const byDate = new Map<string, DailyPricePoint>()
  for (const point of prices) {
    byDate.set(point.date, point)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}
