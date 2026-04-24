'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Route } from 'next'
import { getSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginSchema } from '@/validation/auth-schema'
import { cn } from '@/lib/utils'

type LoginValues = z.infer<typeof loginSchema>

type LoginFormProps = {
  className?: string
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'owner@example.com',
      password: 'changeMeOwner1!',
    },
  })

  const applyCredentials = (email: string, password: string) => {
    form.setValue('email', email)
    form.setValue('password', password)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
    })

    if (result?.error) {
      toast.error('Invalid credentials')
      return
    }

    const session = await getSession()
    const role = session?.user?.role

    const destination = role === 'SUPER_ADMIN' ? '/admin/overview' : '/business/dashboard'

    toast.success('Welcome back!')
    router.replace(destination as Route)
  })

  const isSubmitting = form.formState.isSubmitting

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          Use the seeded admin account or replace with your own auth provider.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Email
        </label>
        <Input autoComplete="email" {...form.register('email')} />
        <FormError message={form.formState.errors.email?.message} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Password
        </label>
        <Input
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        <FormError message={form.formState.errors.password?.message} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/80 px-3 py-2 text-xs text-muted-foreground">
        <span>Quick fill:</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyCredentials('admin@example.com', "changeMeAdmin1!")}
          >
            Admin
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyCredentials('owner.northwind@example.com', "changeMeOwner1!")}
          >
            Owner
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}

type FormErrorProps = {
  message?: string
}

function FormError({ message }: FormErrorProps) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}
