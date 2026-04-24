import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS, type Order } from '@/types/order'

type OrderTableProps = {
  orders: Order[]
  totalItems: number
  currentPage: number
  totalPages: number
  isLoading?: boolean
  isFetching?: boolean
  onOpen: (order: Order) => void
  onPageChange: (page: number) => void
}

const STATUS_STYLES: Record<Order['status'], string> = {
  RECEIVED: 'bg-amber-50 text-amber-700',
  PREPARING: 'bg-sky-50 text-sky-700',
  READY: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-surface-muted text-muted-foreground',
  CANCELLED: 'bg-rose-50 text-rose-700',
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status as Order['status']] ?? 'bg-slate-100 text-slate-700'
}

function getStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status as Order['status']] ?? status
}

export function OrderTable({
  orders,
  totalItems,
  currentPage,
  totalPages,
  isLoading = false,
  isFetching = false,
  onOpen,
  onPageChange,
}: OrderTableProps) {
  const showInitialLoader = isLoading && orders.length === 0
  const showFetchingOverlay = isFetching && !showInitialLoader
  const isPagingDisabled = isLoading || isFetching

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
      aria-busy={isLoading || isFetching}
    >
      <div className="hidden grid-cols-[1.6fr_1.1fr_2fr_1.1fr_0.7fr_0.8fr] gap-4 bg-surface-muted px-7 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground md:grid">
        <p>Ref / Guest</p>
        <p>Status</p>
        <p>Items</p>
        <p>Created</p>
        <p>Count</p>
        <p>Actions</p>
      </div>

      <div>
        {showInitialLoader ? (
          <OrderTableSkeleton />
        ) : orders.length ? (
          orders.map((order) => (
            <article
              key={order.id}
              className="grid gap-4 border-t border-border px-5 py-5 first:border-t-0 md:grid-cols-[1.6fr_1.1fr_2fr_1.1fr_0.7fr_0.8fr]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
                    {order.orderRef}
                  </div>
                  {order.tableLabel ? (
                    <p className="text-sm font-medium text-muted-foreground">{order.tableLabel}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-lg font-semibold leading-tight text-foreground">
                    {order.guestName ?? 'Guest order'}
                  </p>
                  {order.orderNote ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{order.orderNote}</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No note</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="space-y-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <div
                    key={`${order.id}-${item.itemId ?? item.itemNameSnapshot}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-foreground">
                      {item.quantity}x {item.itemNameSnapshot}
                    </span>
                    <span className="text-muted-foreground">${Number(item.priceSnapshot ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                {order.items.length > 3 ? (
                  <p className="text-xs font-medium text-muted-foreground">+{order.items.length - 3} more items</p>
                ) : null}
              </div>

              <div className="flex items-center text-base font-medium text-muted-foreground">
                {formatTime(order.createdAt)}
              </div>

              <div className="flex items-center text-sm font-semibold text-foreground">
                <p className="text-sm font-semibold text-foreground">{order.itemCount} items</p>
              </div>

              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 text-primary hover:text-primary-hover"
                  onClick={() => onOpen(order)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="px-7 py-14 text-center text-muted-foreground">
            No orders match your filters yet.
          </div>
        )}
      </div>

      {showFetchingOverlay ? (
        <div className="absolute inset-x-0 top-[61px] z-10 flex items-center justify-center border-y border-border bg-surface/75 px-4 py-3 text-sm font-medium text-muted-foreground backdrop-blur-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating orders...
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-muted px-7 py-5">
        <p className="text-sm text-muted-foreground">
          {showInitialLoader ? 'Loading orders...' : `Showing ${orders.length} of ${totalItems} orders`}
        </p>

        <div className="flex items-center gap-2">
          <PagerButton
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={isPagingDisabled || currentPage <= 1}
            icon={<ChevronLeft className="h-4 w-4" />}
          />
          {getVisiblePages(currentPage, totalPages).map((page) => {
            const isActive = page === currentPage
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                disabled={isPagingDisabled}
                className={`h-10 min-w-10 rounded-xl border text-sm font-semibold ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:border-border-contrast disabled:opacity-40'
                }`}
              >
                {page}
              </button>
            )
          })}
          <PagerButton
            onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
            disabled={isPagingDisabled || currentPage >= totalPages}
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
      </footer>
    </section>
  )
}

function OrderTableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 5 }, (_, index) => (
        <article
          key={index}
          className="grid gap-4 border-t border-border px-5 py-5 first:border-t-0 md:grid-cols-[1.6fr_1.1fr_2fr_1.1fr_0.7fr_0.8fr]"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-28 rounded-xl bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
          <div className="flex items-center">
            <div className="h-7 w-24 rounded-full bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="h-5 w-28 rounded bg-muted" />
          </div>
          <div className="flex items-center">
            <div className="h-5 w-14 rounded bg-muted" />
          </div>
          <div className="flex items-center">
            <div className="h-9 w-20 rounded-xl bg-muted" />
          </div>
        </article>
      ))}
    </div>
  )
}

type PagerButtonProps = {
  onClick: () => void
  disabled: boolean
  icon: ReactNode
}

function PagerButton({ onClick, disabled, icon }: PagerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-border-contrast disabled:opacity-40"
    >
      {icon}
    </button>
  )
}

function formatTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 2) {
    return [1, 2, 3]
  }

  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages]
  }

  return [currentPage - 1, currentPage, currentPage + 1]
}
