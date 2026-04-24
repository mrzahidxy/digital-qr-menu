'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/types/order'
import { getOrderById } from './api/order-client'
import { orderKeys } from './api/order-keys'
import { OrderForm } from './components/order-form'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const hasShownError = useRef(false)

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  })

  useEffect(() => {
    if (
      !isLoading &&
      (error || !order) &&
      !hasShownError.current
    ) {
      toast.error('Failed to load order data')
      hasShownError.current = true
    }
  }, [isLoading, error, order])

  useEffect(() => {
    if (!isLoading && order) {
      hasShownError.current = false
    }
  }, [isLoading, order])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading..."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="app-card">
        <h1 className="text-2xl font-semibold text-foreground">
          {order?.orderRef ?? 'Order'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {order ? (
            <>
              Status:{' '}
              <span className="font-medium text-foreground">
                {ORDER_STATUS_LABELS[order.status]}
              </span>{' '}
              - Last updated {formatDate(order.updatedAt)}
            </>
          ) : (
            'Order details unavailable.'
          )}
        </p>
      </div>

      {order ? <OrderForm order={order} /> : null}
    </div>
  )
}
