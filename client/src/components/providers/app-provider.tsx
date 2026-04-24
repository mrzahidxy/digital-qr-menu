'use client'

import { ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'

import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthSessionGuard } from '@/components/providers/auth-session-guard'
import { Toaster } from '@/components/ui/sonner-toaster'

type AppProviderProps = {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <AuthSessionGuard />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
          <Toaster />
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
