import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardHeaderProps = {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
  tone?: 'card' | 'flat'
}

export function DashboardHeader({
  title,
  description,
  icon,
  actions,
  className,
  tone = 'card',
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-6',
        tone === 'card'
          ? 'rounded-xl border border-border bg-surface px-6 py-6 shadow-soft sm:px-10'
          : 'border-b border-border px-0 pb-6 pt-1',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {icon && tone === 'card' ? (
          <span className="rounded-2xl border border-primary/30 bg-primary-soft p-3 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="space-y-2">
          <h1
            className={cn(
              'text-foreground',
              tone === 'card'
                ? 'text-2xl font-semibold'
                : 'text-xl font-semibold leading-tight sm:text-2xl'
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'max-w-2xl text-muted-foreground',
                tone === 'card' ? 'text-sm' : 'text-base sm:text-lg'
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  )
}
