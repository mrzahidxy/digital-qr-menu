import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type StatCardProps = {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  trend?: {
    value: string
    isPositive?: boolean
  }
  className?: string
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        'flex min-w-[220px] flex-1 flex-col gap-3 rounded-xl border border-border bg-surface px-6 py-5 shadow-soft',
        className
      )}
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary-soft text-primary">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          {trend?.value ? (
            <span
              className={cn(
                'font-semibold',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-500'
              )}
            >
              {trend.value}
            </span>
          ) : null}
          {helper ? <span>{helper}</span> : null}
        </div>
      </div>
    </article>
  )
}
