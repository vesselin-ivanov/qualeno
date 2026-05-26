import BarMetricChartCard from './BarMetricChartCard'

type ChartPoint = {
  quarter: string
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

type PricePoint = {
  day: string
  close: number
  date: string
}

type FundamentalsChartsProps = {
  chartData: ChartPoint[]
  priceData: PricePoint[]
  currency: string
}

export default function FundamentalsCharts({ chartData, priceData, currency }: FundamentalsChartsProps) {
  const latestYear = priceData.at(-1)?.date.slice(0, 4)
  const ytdSeries = latestYear
    ? priceData.filter((point) => point.date.startsWith(latestYear))
    : []
  const startPrice = ytdSeries[0]?.close ?? 0
  const endPrice = ytdSeries.at(-1)?.close ?? 0
  const hasYtd = startPrice > 0 && endPrice > 0
  const ytdReturn = hasYtd ? ((endPrice - startPrice) / startPrice) * 100 : 0
  const isPositiveYtd = ytdReturn >= 0
  const priceColor = isPositiveYtd ? '#16a34a' : '#dc2626'
  const ytdLabel = `${isPositiveYtd ? '+' : ''}${ytdReturn.toFixed(2)}% YTD`

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      <BarMetricChartCard
        title="Price"
        titleSuffix={
          <span
            className={`text-sm font-medium ${
              isPositiveYtd ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {hasYtd ? ytdLabel : 'N/A YTD'}
          </span>
        }
        data={priceData}
        xDataKey="day"
        dataKey="close"
        color={priceColor}
        legendName="Price"
        chartType="area"
        lineArea
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="EPS (diluted)"
        data={chartData}
        dataKey="reportedEPS"
        color="#f472b6"
        legendName="EPS"
        valuePrefix="$"
        height={280}
      />

      <BarMetricChartCard
        title="Revenue"
        data={chartData}
        dataKey="totalRevenue"
        color="#22d3ee"
        legendName="Revenue"
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="Net Income"
        data={chartData}
        dataKey="netIncome"
        color="#34d399"
        legendName="Net Income"
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="EBITDA"
        data={chartData}
        dataKey="ebitda"
        color="#60a5fa"
        legendName="EBITDA"
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="Free Cash Flow"
        data={chartData}
        dataKey="freeCashFlow"
        color="#f59e0b"
        legendName="Free Cash Flow"
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="Cash & Debt"
        data={chartData}
        series={[
          {
            dataKey: 'cash',
            color: '#15803d',
            legendName: 'Cash',
          },
          {
            dataKey: 'debt',
            color: '#b91c1c',
            legendName: 'Debt',
          },
        ]}
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="Operating Expenses"
        data={chartData}
        dataKey="expenses"
        color="#a78bfa"
        legendName="Expenses"
        currency={currency}
        height={280}
        formatAsMoney
      />

      <BarMetricChartCard
        title="Shares Outstanding"
        data={chartData}
        dataKey="sharesOutstanding"
        color="#0ea5e9"
        legendName="Shares"
        height={280}
        formatAsCompactNumber
      />

      <BarMetricChartCard
        title="Dividends"
        data={chartData}
        dataKey="dividendsPerShare"
        color="#14b8a6"
        legendName="Dividend"
        currency={currency}
        height={280}
        formatAsMoney
      />

    </section>
  )
}
