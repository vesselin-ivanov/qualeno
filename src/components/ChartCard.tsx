import type { ReactNode } from 'react'

type ChartCardProps = {
  title: string
  titleSuffix?: ReactNode
  children: ReactNode
}

export default function ChartCard({ title, titleSuffix, children }: ChartCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
        {titleSuffix}
      </div>
      {children}
    </article>
  )
}
