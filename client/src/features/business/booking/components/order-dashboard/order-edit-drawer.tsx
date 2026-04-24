'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_TRANSITIONS, type Order, type OrderStatus, type OrderStatusUpdate } from '@/types/order'

type OrderEditDrawerProps = {
  open: boolean
  order: Order | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: OrderStatusUpdate) => void
  statusLabels: Record<OrderStatus, string>
}

export function OrderEditDrawer({
  open,
  order,
  isSaving,
  onOpenChange,
  onSave,
  statusLabels,
}: OrderEditDrawerProps) {
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null)

  useEffect(() => {
    setNextStatus(null)
  }, [order])

  const allowedStatuses = useMemo(
    () => (order ? ORDER_STATUS_TRANSITIONS[order.status] ?? [] : []),
    [order]
  )

  const selectedStatus = nextStatus ?? order?.status ?? null
  const isSaveDisabled = !order || !selectedStatus || selectedStatus === order.status

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-full max-w-[520px] overflow-y-auto border-l border-border bg-surface shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
          )}
        >
          <div className="flex min-h-full flex-col">
            <header className="border-b border-border px-8 py-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogPrimitive.Title className="text-xl font-semibold text-foreground sm:text-2xl">
                    Guest Order
                  </DialogPrimitive.Title>
                  <p className="mt-2 text-base text-muted-foreground">
                    {order ? `${order.orderRef} • ${order.tableLabel ?? 'No table label'}` : 'Order details'}
                  </p>
                </div>
                <DialogPrimitive.Close className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl px-5"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedStatus) return
                    onSave({ status: selectedStatus })
                  }}
                  disabled={isSaveDisabled || isSaving}
                  className="h-11 rounded-xl px-5"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>
            </header>

            <div className="flex-1 space-y-8 px-8 py-7">
              {order ? (
                <>
                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Order Summary
                    </h3>
                    <div className="grid gap-4 rounded-2xl border border-border bg-surface-muted p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Current status</p>
                          <p className="text-lg font-semibold text-foreground">{statusLabels[order.status] ?? order.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Guest</p>
                          <p className="text-base font-medium text-foreground">{order.guestName ?? 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Meta label="Created" value={formatTimestamp(order.createdAt)} />
                        <Meta label="Updated" value={formatTimestamp(order.updatedAt)} />
                        <Meta label="Table label" value={order.tableLabel ?? 'Not provided'} />
                        <Meta label="Items" value={`${order.itemCount}`} />
                      </div>
                      <Meta label="Note" value={order.orderNote ?? 'No note'} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Items
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <article
                          key={`${order.id}-${item.itemId ?? item.itemNameSnapshot}-${index}`}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft"
                        >
                          <div>
                            <p className="font-semibold text-foreground">
                              {item.quantity}x {item.itemNameSnapshot}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Snapshot price: ${Number(item.priceSnapshot ?? 0).toFixed(2)}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Next Status
                    </h3>
                    {allowedStatuses.length > 0 ? (
                      <div className="grid gap-3">
                        {allowedStatuses.map((status) => {
                          const isSelected = selectedStatus === status
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setNextStatus(status)}
                              className={cn(
                                'rounded-2xl border px-4 py-4 text-left transition',
                                isSelected
                                  ? 'border-primary bg-primary-soft text-primary'
                                  : 'border-border bg-surface text-foreground hover:border-border-contrast'
                              )}
                            >
                              <p className="font-semibold">{statusLabels[status]}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Move from {statusLabels[order.status] ?? order.status} to {statusLabels[status] ?? status}.
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4 text-sm text-muted-foreground">
                        This order is closed. No further status changes are allowed.
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-medium text-foreground">{value}</p>
    </div>
  )
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
