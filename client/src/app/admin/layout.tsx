import type { ReactNode } from 'react'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

import { AdminShell } from '@/features/admin'
import { auth } from '@/lib/auth'

type AdminLayoutProps = {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const role = session.user.role

  if (role !== 'SUPER_ADMIN') {
    redirect('/business/dashboard' as Route)
  }

  const user = {
    name: session.user.name ?? 'Super Admin',
    email: session.user.email ?? 'ADMIN@system.com',
  }

  return <AdminShell user={user}>{children}</AdminShell>
}
