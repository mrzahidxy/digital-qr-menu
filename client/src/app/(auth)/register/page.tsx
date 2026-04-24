import Link from 'next/link'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

import { RegisterForm } from '@/features/auth'
import { auth } from '@/lib/auth'

export default async function RegisterPage() {
  const session = await auth()
  const isAuthenticated = Boolean(session?.user) && session?.accessTokenExpired !== true

  if (isAuthenticated) {
    const destination = session?.user?.role === 'SUPER_ADMIN' ? '/admin/overview' : '/business/dashboard'
    redirect(destination as Route)
  }

  return (
    <div className="space-y-6">
      <RegisterForm />
      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link className="text-sky-300 hover:text-sky-200" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
