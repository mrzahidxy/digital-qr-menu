import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Script from 'next/script'
import { Inter } from 'next/font/google'

import { AppProvider } from '@/components/providers/app-provider'
import { PLATFORM_BRANDING } from '@/config/branding'
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const themeInitializer = `(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const getCookieTheme = () => {
    const match = document.cookie.match(new RegExp('(?:^|; )' + storageKey + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  try {
    let theme = localStorage.getItem(storageKey);
    if (theme !== 'light' && theme !== 'dark') {
      const cookieTheme = getCookieTheme();
      if (cookieTheme === 'light' || cookieTheme === 'dark') {
        theme = cookieTheme;
      }
    }
    if (theme !== 'light' && theme !== 'dark') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    applyTheme(theme);
  } catch {
    /* noop */
  }
})();`

export const metadata: Metadata = {
  title: {
    default: PLATFORM_BRANDING.metadataTitle,
    template: PLATFORM_BRANDING.metadataTitleTemplate,
  },
  description: PLATFORM_BRANDING.metadataDescription,
  metadataBase: new URL('https://example.com'),
  openGraph: {
    title: PLATFORM_BRANDING.metadataTitle,
    description: PLATFORM_BRANDING.metadataDescription,
    type: 'website',
    url: 'https://example.com',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

type RootLayoutProps = {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies()
  const storedTheme = cookieStore.get(THEME_STORAGE_KEY)?.value ?? null
  const hasStoredPreference = storedTheme === 'light' || storedTheme === 'dark'
  const initialTheme = (hasStoredPreference ? storedTheme : 'light') as ThemeMode
  const htmlClassName = initialTheme === 'dark' ? 'dark' : undefined

  return (
    <html lang="en" suppressHydrationWarning className={htmlClassName}>
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializer}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-background text-foreground`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
