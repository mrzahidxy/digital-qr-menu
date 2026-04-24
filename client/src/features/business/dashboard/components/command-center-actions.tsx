import type { LucideIcon } from 'lucide-react'
import { Palette, Settings, SquareTerminal, UtensilsCrossed } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type ActionItem = {
  label: string
  href: string
  icon: LucideIcon
  highlighted?: boolean
}

const actionItems: ActionItem[] = [
  {
    label: 'View Orders',
    href: '/business/orders',
    icon: SquareTerminal,
    highlighted: true,
  },
  {
    label: 'Manage Menu',
    href: '/business/menu',
    icon: UtensilsCrossed,
  },
  {
    label: 'Branding & QR',
    href: '/business/branding',
    icon: Palette,
  },
  {
    label: 'Settings',
    href: '/business/settings',
    icon: Settings,
  },
]

export function CommandCenterActions() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Command Center</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {actionItems.map((item, index) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href as Route}
              className={cn(
                'group inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-border px-6 py-5 text-lg font-semibold transition shadow-soft hover:text-current',
                item.highlighted
                  ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                  : 'bg-surface-muted text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
