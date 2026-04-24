import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function SectionCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  footer,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-surface p-6 shadow-soft sm:px-8 sm:py-7',
        className
      )}
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary-soft text-primary">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex items-center gap-3">{actions}</div>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
      {footer ? <footer className="mt-6">{footer}</footer> : null}
    </section>
  )
}
