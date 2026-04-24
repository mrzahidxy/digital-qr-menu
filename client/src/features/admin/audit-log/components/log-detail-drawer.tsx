'use client'

import { useMemo } from 'react'
import { AlertCircle, Calendar, ClipboardList, Hash, Info, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/features/admin/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/admin/components/ui/sheet'
import { formatDate } from '@/lib/format'

import type { AuditLogDetail, AuditLog } from '../api/log-client'

type AuditLogDetailDrawerProps = {
  log: AuditLog | AuditLogDetail | null
  open: boolean
  isLoading: boolean
  onClose: () => void
}

function statusVariant(level: AuditLog['level']) {
  switch (level) {
    case 'ERROR':
      return 'destructive'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'success'
    case 'DEBUG':
      return 'default'
    default:
      return 'outline'
  }
}

function detailValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

function extractMetaText(meta: Record<string, unknown> | null, key: string) {
  const value = meta?.[key]
  if (typeof value === 'string' && value.trim()) return value
  return null
}

export function AuditLogDetailDrawer({ log, open, isLoading, onClose }: AuditLogDetailDrawerProps) {
  const timezoneLabel = useMemo(() => {
    if (!log?.timestamp) {
      return '—'
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZoneName: 'short',
    }).format(new Date(log.timestamp))
  }, [log?.timestamp])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>{log ? `Log #${log.id}` : 'Log details'}</SheetTitle>
              <Badge variant={statusVariant(log?.level ?? 'INFO')}>{log?.level ?? 'INFO'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {log ? log.message : 'Loading log entry...'}
            </p>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && !log ? (
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-3">Event Information</h3>
                <div className="space-y-3">
                  <DetailRow icon={Hash} label="ID" value={log?.id ?? '—'} />
                  <DetailRow icon={ClipboardList} label="Entity" value={extractMetaText(log?.meta ?? null, 'entityType') ?? extractMetaText(log?.meta ?? null, 'entity') ?? log?.category ?? '—'} />
                  <DetailRow icon={Info} label="Action" value={extractMetaText(log?.meta ?? null, 'action') ?? extractMetaText(log?.meta ?? null, 'event') ?? log?.message ?? '—'} />
                  <DetailRow icon={Calendar} label="Timestamp" value={timezoneLabel} />
                  <DetailRow icon={Calendar} label="Created" value={log?.createdAt ? formatDate(log.createdAt) : '—'} />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Context</h3>
                <div className="space-y-3">
                  <DetailRow icon={User} label="Actor" value={log?.user ? `${log.user.email} (${log.user.role})` : extractMetaText(log?.meta ?? null, 'actor') ?? 'System'} />
                  <DetailRow icon={Info} label="IP Address" value={log?.ipAddress ?? '—'} />
                  <DetailRow icon={Info} label="User Agent" value={log?.userAgent ?? '—'} />
                  <DetailRow icon={Info} label="Context" value={extractMetaText(log?.meta ?? null, 'context') ?? extractMetaText(log?.meta ?? null, 'reason') ?? extractMetaText(log?.meta ?? null, 'details') ?? '—'} />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Metadata</h3>
                <details className="rounded-lg border border-border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    View structured metadata
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                    {detailValue(log?.meta ?? null)}
                  </pre>
                </details>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlertCircle
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}
