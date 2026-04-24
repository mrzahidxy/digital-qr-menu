import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 8% 12%, hsl(var(--primary) / 0.16) 0%, transparent 60%), radial-gradient(60% 45% at 92% 84%, hsl(var(--accent) / 0.18) 0%, transparent 62%), linear-gradient(165deg, hsl(var(--background)) 0%, hsl(var(--shell)) 56%, hsl(var(--surface-muted)) 100%)',
        }}
      />

      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-2 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-8 shadow-soft backdrop-blur-md">
        {children}
      </div>
    </div>
  )
}
