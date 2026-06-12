import type { CustomKpiPoint } from '../types'
import BarMetricChartCard from './BarMetricChartCard'

type CustomKpiChartsProps = {
  kpis: CustomKpiPoint[]
}

const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f472b6', '#64748b']

export default function CustomKpiCharts({ kpis }: CustomKpiChartsProps) {
  if (kpis.length === 0) {
    return null
  }

  const metricKeys = Array.from(new Set(kpis.flatMap((row) => Object.keys(row.metrics))))
  if (metricKeys.length === 0) {
    return null
  }

  const labels = kpis.reduce<Record<string, string>>(
    (acc, row) => ({
      ...acc,
      ...row.labels,
    }),
    {},
  )
  const chartData = kpis.map((row) => ({
    period: formatPeriodLabel(row.fiscalDateEnding),
    fiscalDateEnding: row.fiscalDateEnding,
    ...row.metrics,
  }))

  return (
    <section className="mt-3">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Custom KPIs</h2>
        <p className="mt-1 text-sm text-slate-500">Custom KPI columns from the ticker Google Sheet.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {metricKeys.map((metricKey, index) => (
          <BarMetricChartCard
            key={metricKey}
            title={formatKpiTitle(labels[metricKey] ?? metricKey)}
            data={chartData}
            xDataKey="period"
            dataKey={metricKey}
            color={colors[index % colors.length]}
            legendName={formatKpiTitle(labels[metricKey] ?? metricKey)}
            height={280}
            formatAsCompactNumber
          />
        ))}
      </div>
    </section>
  )
}

function formatPeriodLabel(fiscalDateEnding: string): string {
  const [year, month] = fiscalDateEnding.split('-')
  const monthNumber = Number(month)
  const quarter = Math.min(4, Math.max(1, Math.ceil(monthNumber / 3)))
  return `Q${quarter} ${year.slice(-2)}`
}

function formatKpiTitle(value: string): string {
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return splitCompactWords(spaced)
    .map((word) => {
      const normalized = word.toLowerCase()
      if (normalized === 'aws') return 'AWS'
      return normalized.replace(/^\w/, (char) => char.toUpperCase())
    })
    .join(' ')
}

function splitCompactWords(value: string): string[] {
  if (value.includes(' ')) {
    return value.split(' ').filter(Boolean)
  }

  const terms = [
    'international',
    'north',
    'america',
    'advertising',
    'subscription',
    'subscriptions',
    'third',
    'party',
    'operating',
    'physical',
    'services',
    'service',
    'revenue',
    'income',
    'expense',
    'expenses',
    'margin',
    'stores',
    'store',
    'seller',
    'sales',
    'online',
    'aws',
  ].sort((a, b) => b.length - a.length)
  const words: string[] = []
  let remaining = value.toLowerCase()

  while (remaining.length > 0) {
    const match = terms.find((term) => remaining.startsWith(term))
    if (!match) {
      words.push(remaining)
      break
    }
    words.push(match)
    remaining = remaining.slice(match.length)
  }

  return words
}
