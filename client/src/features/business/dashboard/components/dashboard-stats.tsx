import { ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'

type DashboardStat = {
  label: string
  value: string
  helper?: string
  badge?: string
  trendUp?: boolean
}

type DashboardStatsProps = {
  stats: DashboardStat[]
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="rounded-2xl border border-border bg-surface px-7 py-6 shadow-soft"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {stat.label}
          </p>
          <div className="mt-5 flex items-end gap-3">
            <p className="text-2xl font-semibold tracking-wide text-primary sm:text-3xl">{stat.value}</p>
            {stat.trendUp ? (
              <ArrowUpRight className="mb-2 h-4 w-4 text-emerald-500" />
            ) : null}
            {stat.badge ? (
              <span className="mb-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {stat.badge}
              </span>
            ) : null}
          </div>
          {stat.helper ? (
            <p className={cn('mt-2 text-sm text-muted-foreground')}>{stat.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  )
}
