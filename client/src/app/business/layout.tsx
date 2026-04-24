import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

type BusinessOwnerLayoutProps = {
  children: ReactNode
}

export default async function BusinessOwnerLayout({ children }: BusinessOwnerLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const role = session.user.role

  if (role !== 'OWNER' && role !== 'STAFF') {
    redirect('/login' as Route)
  }

  return <AppShell>{children}</AppShell>
}
