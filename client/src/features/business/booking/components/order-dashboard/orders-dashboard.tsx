'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS, type Order, type OrderStatusUpdate, type PaginatedResult, type ResourceFilters } from '@/types/order'

import { updateOrderStatusRequest } from '../../api/order-client'
import { orderKeys } from '../../api/order-keys'
import { useOrdersTable } from '../order-table/use-order-table'
import { OrderEditDrawer } from './order-edit-drawer'
import { OrderFilters } from './order-filters'
import { OrderTable } from './order-table'

type OrdersDashboardProps = {
  initialData?: PaginatedResult<Order>
}

export function OrdersDashboard({ initialData }: OrdersDashboardProps) {
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const queryClient = useQueryClient()

  const {
    sorting,
    setSorting,
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    page,
    status,
    tableLabel,
    guestName,
    createdFrom,
    setPage,
    setStatus,
    setTableLabel,
    setGuestName,
    setCreatedFrom,
    reset,
  } = useOrdersTable({
    initialData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrderStatusUpdate }) =>
      updateOrderStatusRequest(String(id), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Order status updated')
      setIsEditDrawerOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update order status')
    },
  })

  const sortValue = useMemo(() => {
    const sort = sorting[0]
    return `${sort?.id ?? 'createdAt'}:${sort?.desc === false ? 'asc' : 'desc'}`
  }, [sorting])

  const handleSortChange = (value: string) => {
    const [id, direction] = value.split(':') as [ResourceFilters['sortBy'], 'asc' | 'desc']
    setSorting([{ id: id ?? 'createdAt', desc: direction !== 'asc' }])
  }

  return (
    <div className="space-y-6">
      <section className="app-toolbar">
        <div className="space-y-1">
          <h1 className="app-section-title">Incoming Orders</h1>
          <p className="text-sm text-muted-foreground">Newest orders first. Staff can move each order through the queue.</p>
        </div>
      </section>

      <div className="mt-7 space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            Unable to load orders. Please retry.
            <Button className="ml-3" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        <OrderFilters
          tableLabel={tableLabel}
          guestName={guestName}
          status={status}
          createdFrom={createdFrom}
          sortValue={sortValue}
          onTableLabelChange={setTableLabel}
          onGuestNameChange={setGuestName}
          onStatusChange={setStatus}
          onCreatedFromChange={setCreatedFrom}
          onSortChange={handleSortChange}
          onReset={reset}
        />

        <div>
          <OrderTable
            orders={data.data}
            totalItems={data.meta.totalItems}
            currentPage={page}
            totalPages={Math.max(1, data.meta.totalPages)}
            isLoading={isLoading}
            isFetching={isFetching}
            onOpen={(order) => {
              setSelectedOrder(order)
              setIsEditDrawerOpen(true)
            }}
            onPageChange={setPage}
          />
        </div>
      </div>

      <OrderEditDrawer
        open={isEditDrawerOpen}
        order={selectedOrder}
        isSaving={updateMutation.isPending}
        onOpenChange={setIsEditDrawerOpen}
        onSave={(payload) => {
          if (!selectedOrder) return
          updateMutation.mutate({
            id: selectedOrder.id,
            payload,
          })
        }}
        statusLabels={ORDER_STATUS_LABELS}
      />
    </div>
  )
}
