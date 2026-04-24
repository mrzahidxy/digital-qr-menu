import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type LoaderProps = {
  label?: string
  className?: string
  iconClassName?: string
}

export function Loader({
  label = 'Loading...',
  className,
  iconClassName,
}: LoaderProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 text-sm text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('h-5 w-5 animate-spin', iconClassName)} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </div>
  )
}
