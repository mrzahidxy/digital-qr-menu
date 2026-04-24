'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { orderSchema, type OrderFormValues } from '@/validation/order-schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Minus, Plus, Send, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type CartFormLine = {
  itemId: string
  itemName: string
  imageUrl: string | null
  quantity: number
}

type CartFormProps = {
  cartLines: CartFormLine[]
  itemCount: number
  primaryColor: string
  isSubmitting: boolean
  isSubmitDisabled: boolean
  confirmationOrderRef?: string
  onSubmit: (values: OrderFormValues) => void
  onDecreaseItem: (itemId: string) => void
  onIncreaseItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
}

const defaultValues: OrderFormValues = {
  guestName: '',
  tableLabel: '',
  orderNote: '',
}

export function CartForm({
  cartLines,
  itemCount,
  primaryColor,
  isSubmitting,
  isSubmitDisabled,
  confirmationOrderRef,
  onSubmit,
  onDecreaseItem,
  onIncreaseItem,
  onRemoveItem,
}: CartFormProps) {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues,
  })

  useEffect(() => {
    if (confirmationOrderRef) {
      form.reset(defaultValues)
    }
  }, [confirmationOrderRef, form])

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Your Cart</h3>
        <Badge variant="outline">{itemCount} items</Badge>
      </header>

      <div className="space-y-3">
        <FormField label="Guest name" error={form.formState.errors.guestName?.message}>
          <Input
            placeholder="Guest name"
            autoComplete="name"
            {...form.register('guestName')}
          />
        </FormField>

        <FormField label="Table label" error={form.formState.errors.tableLabel?.message}>
          <Input placeholder="Table label" {...form.register('tableLabel')} />
        </FormField>

        <FormField label="Order note" error={form.formState.errors.orderNote?.message}>
          <Textarea
            className="min-h-[84px]"
            placeholder="Order note"
            {...form.register('orderNote')}
          />
        </FormField>
      </div>

      {cartLines.length === 0 ? (
        <p className="text-sm text-slate-500">No items yet. Add from menu cards.</p>
      ) : (
        <div className="space-y-3">
          {cartLines.map((line) => (
            <article key={line.itemId} className="rounded-xl border border-slate-200 p-3">
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {line.imageUrl ? (
                    <img
                      src={line.imageUrl}
                      alt={line.itemName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {line.itemName}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.itemId)}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${line.itemName} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onDecreaseItem(line.itemId)}
                        aria-label={`Decrease ${line.itemName} quantity`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-6 text-center text-sm font-medium">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onIncreaseItem(line.itemId)}
                        aria-label={`Increase ${line.itemName} quantity`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        style={{ backgroundColor: primaryColor, color: '#ffffff' }}
        disabled={isSubmitting || isSubmitDisabled}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Order
          </>
        )}
      </Button>

      {confirmationOrderRef ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p className="font-semibold">Order received</p>
          <p className="mt-1">Reference: {confirmationOrderRef}</p>
        </div>
      ) : null}
    </form>
  )
}

type FormFieldProps = {
  label: string
  children: ReactNode
  error?: string
}

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-rose-600">{error}</span>
      ) : null}
    </label>
  )
}
