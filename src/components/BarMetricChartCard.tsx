import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'
import ChartCard from './ChartCard'

type ChartPoint = {
  [key: string]: number | string
}

type BarMetricChartCardProps = {
  title: string
  titleSuffix?: ReactNode
  data: ChartPoint[]
  xDataKey?: string
  dataKey?: string
  color?: string
  legendName?: string
  series?: Array<{
    dataKey: string
    color: string
    legendName: string
  }>
  chartType?: 'bar' | 'line' | 'area'
  lineArea?: boolean
  currency?: string
  height: number
  formatAsMoney?: boolean
  formatAsCompactNumber?: boolean
  valuePrefix?: string
}

const money = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

function getCurrencyPrefix(currency?: string): string {
  if (!currency) return ''
  const normalized = currency.trim().toUpperCase()
  if (normalized === 'USD') return '$'
  if (normalized === 'EUR') return '€'
  if (normalized === 'GBP') return '£'
  return `${normalized} `
}

type TooltipPayloadItem = {
  value: number | string
  name: string
  color?: string
}

function darkenHexColor(hex: string, amount = 0.2): string {
  const sanitized = hex.replace('#', '')
  if (sanitized.length !== 6) return hex
  const num = Number.parseInt(sanitized, 16)
  if (!Number.isFinite(num)) return hex

  const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * (1 - amount))))
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * (1 - amount))))
  const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * (1 - amount))))

  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

export default function BarMetricChartCard({
  title,
  titleSuffix,
  data,
  xDataKey = 'quarter',
  dataKey,
  color,
  legendName,
  series,
  chartType = 'bar',
  lineArea = false,
  currency,
  height,
  formatAsMoney = false,
  formatAsCompactNumber = false,
  valuePrefix,
}: BarMetricChartCardProps) {
  const compactHeight = Math.max(180, height - 60)
  const areaGradientId = `${title.toLowerCase().replace(/\s+/g, '-')}-line-area`
  const resolvedSeries = series ?? (
    dataKey && color && legendName
      ? [{ dataKey, color, legendName }]
      : []
  )

  return (
    <ChartCard title={title} titleSuffix={titleSuffix}>
      <ResponsiveContainer width="100%" height={compactHeight}>
        {chartType === 'line' || chartType === 'area' ? (
          <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            {lineArea && (
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={resolvedSeries[0]?.color ?? '#0284c7'} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={resolvedSeries[0]?.color ?? '#0284c7'} stopOpacity={0.03} />
                </linearGradient>
              </defs>
            )}
            <XAxis
              dataKey={xDataKey}
              stroke="#64748b"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#64748b"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              width={36}
              tickFormatter={
                formatAsMoney
                  ? (value: number) => money.format(value)
                  : formatAsCompactNumber
                    ? (value: number) => compactNumber.format(value)
                    : valuePrefix
                      ? (value: number) => `${valuePrefix}${value.toFixed(2)}`
                      : undefined
              }
            />
            <Tooltip
              cursor={false}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as TooltipPayloadItem[] | undefined}
                  label={props.label as string | undefined}
                  formatAsMoney={formatAsMoney}
                  formatAsCompactNumber={formatAsCompactNumber}
                  currency={currency}
                  valuePrefix={valuePrefix}
                />
              )}
            />
            {lineArea && (
              <Area
                type="monotone"
                dataKey={resolvedSeries[0]?.dataKey}
                stroke="none"
                fill={`url(#${areaGradientId})`}
              />
            )}
            {resolvedSeries.map((item) => (
              <Line
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                stroke={item.color}
                name={item.legendName}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: item.color }}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart accessibilityLayer={false} data={data} barCategoryGap="14%" barGap={2} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey={xDataKey}
            stroke="#64748b"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            width={36}
            tickFormatter={
              formatAsMoney
                ? (value: number) => money.format(value)
                : formatAsCompactNumber
                  ? (value: number) => compactNumber.format(value)
                  : valuePrefix
                    ? (value: number) => `${valuePrefix}${value.toFixed(2)}`
                    : undefined
            }
          />
          <Tooltip
            cursor={false}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload as TooltipPayloadItem[] | undefined}
                label={props.label as string | undefined}
                formatAsMoney={formatAsMoney}
                formatAsCompactNumber={formatAsCompactNumber}
                currency={currency}
                valuePrefix={valuePrefix}
              />
            )}
          />
          {resolvedSeries.map((item) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              fill={item.color}
              activeBar={{ fill: darkenHexColor(item.color, 0.24) }}
              name={item.legendName}
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
            />
          ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  formatAsMoney,
  formatAsCompactNumber,
  currency,
  valuePrefix,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  formatAsMoney: boolean
  formatAsCompactNumber: boolean
  currency?: string
  valuePrefix?: string
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      <div className="mb-1 border-t border-slate-200" />
      {payload.map((item) => {
        const rawValue = Number(item.value)
        const currencyPrefix = getCurrencyPrefix(currency)
        const value = formatAsMoney
          ? `${currencyPrefix}${money.format(rawValue)}`
          : formatAsCompactNumber
            ? compactNumber.format(rawValue)
            : valuePrefix
              ? `${valuePrefix}${rawValue.toFixed(2)}`
              : rawValue.toFixed(2)

        return (
          <p key={item.name} className="flex items-center gap-1.5 text-slate-900">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color ?? '#0f172a' }}
            />
            <span>{item.name}: <span className="font-semibold">{value}</span></span>
          </p>
        )
      })}
    </div>
  )
}
