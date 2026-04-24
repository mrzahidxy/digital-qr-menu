import type { ReactNode } from 'react'
import { Bell, CircleHelp } from 'lucide-react'
import Link from 'next/link'

import { SidebarLogoutLink } from '@/components/layout/sidebar-logout-link'
import { UserMenu } from '@/components/layout/user-menu'
import { NavLinks } from '@/components/navigation/nav-links'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PLATFORM_BRANDING } from '@/config/branding'
import { auth } from '@/lib/auth'

type AppShellProps = {
  children: ReactNode
}

function initialsFor(name?: string | null) {
  if (!name) return 'BO'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

export async function AppShell({ children }: AppShellProps) {
  const session = await auth()
  const name = session?.user?.name ?? 'Business Owner'
  const email = session?.user?.email ?? 'owner@system.com'
  const role = session?.user?.role ?? 'owner'
  const userId = session?.user?.id ?? null
  const initials = initialsFor(name)

  return (
    <div className="flex min-h-screen bg-shell text-foreground">
      <aside className="hidden w-[290px] flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-9 py-10">
          <Link href="/business/dashboard" className="text-5xl font-semibold text-primary">
            {PLATFORM_BRANDING.name}
          </Link>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {PLATFORM_BRANDING.consoleLabel}
          </p>
        </div>

        <div className="flex h-full flex-col px-5 py-6">
          <div className="flex-1">
            <NavLinks />
          </div>

        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Operations Workspace
            </p>

            <div className="flex items-center gap-2">
              <ThemeToggle label="" />
              <UserMenu name={name} email={email} role={role} userId={userId} />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-12">{children}</div>
        </main>
      </div>
    </div>
  )
}
