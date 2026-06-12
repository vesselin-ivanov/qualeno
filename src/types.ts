export type QuarterlyReport = {
  fiscalDateEnding: string
  totalRevenue: number
  netIncome: number
  reportedEPS: number
  expenses: number
  ebitda: number
  freeCashFlow: number
  cash: number
  debt: number
  sharesOutstanding: number
  dividendsPerShare: number
}

export type ReportPeriod = 'quarterly' | 'annual'

export type DailyPricePoint = {
  date: string
  close: number
}

export type CustomKpiPoint = {
  fiscalDateEnding: string
  metrics: Record<string, number>
  labels: Record<string, string>
}

export type TickerResponse = {
  ticker: string
  companyName: string
  sector?: string
  industry?: string
  category?: string
  exchange?: string
  location?: string
  currency: string
  source: string
  reports: QuarterlyReport[]
  quarterlyReports: QuarterlyReport[]
  annualReports: QuarterlyReport[]
  priceHistory: DailyPricePoint[]
  customKpis?: CustomKpiPoint[]
  error?: string
}

export type AppState = {
  initialTicker: string
  initialData: TickerResponse
}

declare global {
  interface Window {
    __INITIAL_STATE__?: AppState
  }
}
