'use client'

import { useMemo } from 'react'
import { AlertCircle, Calendar, Clock3, KeyRound, Store, WalletCards } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { Separator } from '@/features/admin/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/admin/components/ui/sheet'

import type { LicenseKeyDetail, LicenseKey } from './api/license-client'

type LicenseDetailDrawerProps = {
  license: LicenseKey | LicenseKeyDetail | null
  open: boolean
  isLoading: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof KeyRound
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

function LoadingBlock() {
  return <div className="h-4 w-full animate-pulse rounded bg-muted" />
}

function statusVariant(status: LicenseKey['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'EXPIRED':
      return 'destructive'
    case 'SUSPENDED':
      return 'outline'
    default:
      return 'outline'
  }
}

export function LicenseDetailDrawer({
  license,
  open,
  isLoading,
  onClose,
  onEdit,
  onDelete,
}: LicenseDetailDrawerProps) {
  const statusLabel = useMemo(() => {
    if (!license) return 'Unknown'
    return license.status
  }, [license])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>{license?.key ?? 'License details'}</SheetTitle>
              <Badge variant={statusVariant(license?.status ?? 'ACTIVE')}>
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {license ? `Plan ${license.type}` : 'Loading license data...'}
            </p>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && !license ? (
            <div className="space-y-3">
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-3">License Information</h3>
                <div className="space-y-3">
                  <DetailRow icon={KeyRound} label="Key" value={license?.key ?? '—'} />
                  <DetailRow icon={WalletCards} label="Plan" value={license?.type ?? '—'} />
                  <DetailRow icon={Calendar} label="Issued at" value={license?.issuedAt ? formatDate(license.issuedAt) : '—'} />
                  <DetailRow icon={Calendar} label="Expires at" value={license?.expiresAt ? formatDate(license.expiresAt) : '—'} />
                  <DetailRow
                    icon={Clock3}
                    label="Days Remaining"
                    value={license && 'daysRemaining' in license ? String(license.daysRemaining) : '—'}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Associations</h3>
                <div className="space-y-3">
                  <DetailRow
                    icon={Store}
                    label="Business"
                    value={license?.business ? `${license.business.name} · ${license.business.owner.email}` : 'Not assigned'}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Timestamps</h3>
                <div className="space-y-3">
                  <DetailRow icon={Clock3} label="Created" value={license?.createdAt ? formatDate(license.createdAt) : '—'} />
                  <DetailRow icon={Clock3} label="Updated" value={license?.updatedAt ? formatDate(license.updatedAt) : '—'} />
                  <DetailRow
                    icon={AlertCircle}
                    label="Status Note"
                    value={license?.isExpiringSoon ? 'Expiring soon' : license?.isExpired ? 'Expired' : 'Active'}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Button className="w-full" onClick={onEdit} disabled={!license}>
                  Edit License
                </Button>
                <Button variant="destructive" className="w-full" onClick={onDelete} disabled={!license}>
                  Delete License
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
