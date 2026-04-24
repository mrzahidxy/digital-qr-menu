'use client'

import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { registerSchema } from '@/validation/auth-schema'
import { apiClient } from '@/lib/api/client'
import { HttpError } from '@/lib/errors'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await apiClient.post('/api/v1/auth/register', {
        email: values.email,
        fullName: values.name,
        password: values.password,
      })

      toast.success('Account created. Sign in to continue.')
      router.push('/login')
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : 'Registration failed. Please try again.'
      toast.error(message)
    }
  })

  const isSubmitting = form.formState.isSubmitting

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">
          Create an account
        </h1>
        <p className="text-sm text-slate-400">
          Sign up with email/password then plug in OAuth providers when you are
          ready.
        </p>
      </div>

      <FormField
        label="Full name"
        error={form.formState.errors.name?.message}
      >
        <Input autoComplete="name" {...form.register('name')} />
      </FormField>

      <FormField
        label="Email"
        error={form.formState.errors.email?.message}
      >
        <Input autoComplete="email" {...form.register('email')} />
      </FormField>

      <FormField
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>

      <FormField
        label="Confirm password"
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </span>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  )
}

type FormFieldProps = {
  label: string
  children: ReactNode
  error?: string
}

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  )
}
