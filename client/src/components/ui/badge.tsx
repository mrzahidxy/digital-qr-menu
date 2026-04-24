import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'outline' | 'success' | 'warning' | 'destructive'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({
  children,
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide'

  const variants: Record<BadgeVariant, string> = {
    default: 'border-border bg-surface-muted text-foreground',
    outline: 'border-border text-muted-foreground',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    warning: 'border-accent/30 bg-accent-muted text-accent',
    destructive: 'border-rose-200 bg-rose-50 text-rose-600',
  }

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  )
}

