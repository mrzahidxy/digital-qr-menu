'use client'

import { useMemo } from 'react'
import { Calendar, Clock3, Menu, Shield, Users } from 'lucide-react'

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

import type { BusinessDetail, BusinessSummary } from './api/restaurant-client'

type RestaurantDetailDrawerProps = {
  restaurant: BusinessDetail | BusinessSummary | null
  open: boolean
  isLoading: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

const formatRelativeTime = (value: string) => {
  const date = new Date(value)
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const segments: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, seconds] of segments) {
    if (Math.abs(diffInSeconds) >= seconds || unit === 'second') {
      return formatter.format(Math.round(diffInSeconds / seconds), unit)
    }
  }

  return formatter.format(0, 'second')
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Menu
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

export function RestaurantDetailDrawer({
  restaurant,
  open,
  isLoading,
  onClose,
  onEdit,
  onDelete,
}: RestaurantDetailDrawerProps) {
  const activityLabel = useMemo(() => {
    if (!restaurant) return 'Unknown'
    return restaurant.totalOrders > 0 ? 'Active' : 'Quiet'
  }, [restaurant])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>{restaurant?.name ?? 'Business details'}</SheetTitle>
              <Badge variant={activityLabel === 'Active' ? 'default' : 'outline'} className={activityLabel === 'Active' ? 'bg-[#1B9C85] hover:bg-[#1B9C85]/90' : ''}>
                {activityLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {restaurant ? `ID ${restaurant.id}` : 'Loading business data...'}
            </p>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && !restaurant ? (
            <div className="space-y-3">
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-3">General Information</h3>
                <div className="space-y-3">
                  <DetailRow icon={Users} label="Owner" value={restaurant?.owner.email ?? '—'} />
                  <DetailRow
                    icon={Calendar}
                    label="Created"
                    value={restaurant?.createdAt ? formatDate(restaurant.createdAt) : '—'}
                  />
                  <DetailRow
                    icon={Clock3}
                    label="Updated"
                    value={restaurant?.updatedAt ? formatDate(restaurant.updatedAt) : '—'}
                  />
                  <DetailRow
                    icon={Shield}
                    label="Owner Role"
                    value={restaurant && 'role' in restaurant.owner ? restaurant.owner.role : '—'}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Statistics</h3>
                <div className="space-y-3">
                  <DetailRow icon={Menu} label="Menus" value={String(restaurant?.totalMenus ?? '—')} />
                  <DetailRow
                    icon={Menu}
                    label="Published Menus"
                    value={String(restaurant?.publishedMenus ?? '—')}
                  />
                  <DetailRow
                    icon={Users}
                    label="Users"
                    value={String((restaurant as BusinessDetail | null)?.userCount ?? '—')}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Recent Menus</h3>
                <div className="space-y-3">
                  {(restaurant as BusinessDetail | null)?.recentMenus?.length ? (
                    (restaurant as BusinessDetail).recentMenus.map((menu) => (
                      <div key={menu.id} className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{menu.name}</p>
                          <p className="text-xs text-muted-foreground">{menu.status}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatRelativeTime(menu.updatedAt)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No menu activity available.</p>
                  )}
                </div>
              </div>
              <Separator />

              <div>
                <h3 className="mb-3">Users</h3>
                <div className="space-y-3">
                  {(restaurant as BusinessDetail | null)?.users?.length ? (
                    (restaurant as BusinessDetail).users.map((member) => (
                      <div key={`${member.user.id}-${member.createdAt}`} className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{member.user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.user.role}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatRelativeTime(member.createdAt)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No users assigned.</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Button className="w-full" onClick={onEdit} disabled={!restaurant}>
                  Edit Business
                </Button>
                <Button variant="destructive" className="w-full" onClick={onDelete} disabled={!restaurant}>
                  Delete Business
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
