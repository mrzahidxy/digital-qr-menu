'use client'

import type { LucideIcon } from 'lucide-react'
import { BarChart3, LayoutDashboard, MenuSquare, Palette, Settings, Users } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const baseNavigation: NavItem[] = [
  {
    href: '/business/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/business/menu',
    label: 'Menus',
    icon: MenuSquare,
  },
  {
    href: '/business/orders',
    label: 'Orders',
    icon: MenuSquare,
  },
  {
    href: '/business/team',
    label: 'Users & Roles',
    icon: Users,
  },
  {
    href: '/business/branding',
    label: 'Branding & QR',
    icon: Palette,
  },
  {
    href: '/business/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    href: '/business/settings',
    label: 'Settings',
    icon: Settings,
  }
]

export function NavLinks() {
  const pathname = usePathname()
  const navigation = baseNavigation

  return (
    <nav className="flex flex-col gap-2 text-muted-foreground">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              'group relative inline-flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium tracking-wide transition',
              isActive
                ? 'border-primary/30 bg-primary-soft font-semibold text-primary after:absolute after:-right-3 after:top-2 after:h-[calc(100%-1rem)] after:w-1 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
