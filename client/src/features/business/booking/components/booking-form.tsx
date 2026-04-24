'use client'

import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { orderStatusUpdateSchema } from '@/validation/order-schema'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS, type Order, type OrderStatus } from '@/types/order'

import { updateOrderStatusRequest } from '../api/order-client'
import { orderKeys } from '../api/order-keys'

type FormValues = z.infer<typeof orderStatusUpdateSchema>

type OrderFormProps = {
  order: Order
}

export function OrderForm({ order }: OrderFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(orderStatusUpdateSchema),
    defaultValues: {
      status: order.status,
    },
  })

  useEffect(() => {
    form.reset({ status: order.status })
  }, [form, order.status])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => updateOrderStatusRequest(String(order.id), values),
    onSuccess: async () => {
      toast.success('Order status updated')
      await queryClient.invalidateQueries({ queryKey: orderKeys.all })
      await queryClient.invalidateQueries({ queryKey: orderKeys.detail(String(order.id)) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Request failed')
    },
  })

  const allowedStatuses = ORDER_STATUS_TRANSITIONS[order.status]

  return (
    <div className="space-y-6 p-6">
      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <Meta label="Order reference" value={order.orderRef} />
          <Meta label="Current status" value={ORDER_STATUS_LABELS[order.status]} />
          <Meta label="Guest" value={order.guestName ?? 'Not provided'} />
          <Meta label="Table label" value={order.tableLabel ?? 'Not provided'} />
        </div>
        <Meta label="Note" value={order.orderNote ?? 'No note'} />
      </section>

      <section className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Items
          </label>
          <p className="text-xs text-slate-500">Snapshots captured at submit time.</p>
        </div>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <article
              key={`${order.id}-${item.itemId ?? item.itemNameSnapshot}-${index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.quantity}x {item.itemNameSnapshot}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Snapshot price: ${item.priceSnapshot.toFixed(2)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Next status
          </label>
          <p className="text-xs text-slate-500">Only valid queue transitions are available.</p>
        </div>
        {allowedStatuses.length > 0 ? (
          <div className="grid gap-3">
            {allowedStatuses.map((status) => {
              const isSelected = form.watch('status') === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => form.setValue('status', status)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold">{ORDER_STATUS_LABELS[status]}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Move from {ORDER_STATUS_LABELS[order.status]} to {ORDER_STATUS_LABELS[status]}.
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            This order is closed. No further status changes are available.
          </div>
        )}
      </section>

      <footer className="flex items-center justify-end gap-3">
        <Button
          type="button"
          onClick={form.handleSubmit((values) => mutation.mutate(values))}
          disabled={mutation.isPending || !isStatusChangeAllowed(order.status, form.watch('status'))}
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            'Update status'
          )}
        </Button>
      </footer>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-base font-medium text-foreground">{value}</p>
    </div>
  )
}

function isStatusChangeAllowed(current: OrderStatus, next: OrderStatus) {
  return ORDER_STATUS_TRANSITIONS[current].includes(next)
}
