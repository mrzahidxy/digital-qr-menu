import { LoginForm } from '@/features/auth';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';


export default async function LoginPage() {
  const session = await auth()
  const isAuthenticated = Boolean(session?.user) && session?.accessTokenExpired !== true

  if (isAuthenticated) {
    const destination = session?.user?.role === 'SUPER_ADMIN' ? '/admin/overview' : '/business/dashboard'
    redirect(destination as Route)
  }

  return (
    <div className="space-y-6">
      <LoginForm />
      <p className="text-center text-xs text-muted-foreground/80">
        Need an account?{' '}
        <Link className="text-primary hover:text-primary/80" href="/register">
          Register now
        </Link>
      </p>
    </div>
  )
}
