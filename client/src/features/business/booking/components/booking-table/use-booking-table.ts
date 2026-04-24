import { useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'

import { useOrderFilters } from '@/hooks/use-order-filters'
import { fetchOrders } from '../../api/order-client'
import { orderKeys } from '../../api/order-keys'
import type { PaginatedResult, Order, ResourceFilters } from '@/types/order'

type UseOrderTableOptions = {
  initialData?: PaginatedResult<Order>
}

export function useOrdersTable({ initialData }: UseOrderTableOptions) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])
  const {
    page,
    pageSize,
    status,
    tableLabel,
    guestName,
    createdFrom,
    createdTo,
    setPage,
    setPageSize,
    setStatus,
    setTableLabel,
    setGuestName,
    setCreatedFrom,
    setCreatedTo,
    reset,
  } = useOrderFilters()

  const currentSort = sorting[0]
  const sortBy = (currentSort?.id ?? 'updatedAt') as ResourceFilters['sortBy']
  const sortDirection: Required<ResourceFilters>['sortDirection'] =
    currentSort?.desc === false ? 'asc' : 'desc'

  const filters = useMemo<ResourceFilters>(
    () => ({
      page,
      pageSize,
      status: status === 'all' ? undefined : status,
      sortBy,
      sortDirection,
      tableLabel: tableLabel || undefined,
      guestName: guestName || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    }),
    [page, pageSize, status, sortBy, sortDirection, tableLabel, guestName, createdFrom, createdTo]
  )

  const { data, isFetching, isLoading, error, refetch } = useQuery<PaginatedResult<Order>>({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
    initialData,
    placeholderData: (previous) => previous ?? initialData,
  })

  const fallbackData = useMemo<PaginatedResult<Order>>(
    () => ({
      data: [],
      meta: {
        page,
        limit: pageSize,
        totalItems: 0,
        totalPages: 0,
      },
    }),
    [page, pageSize]
  )

  const resolvedData = data ?? fallbackData

  return {
    sorting,
    setSorting,
    data: resolvedData,
    isFetching,
    isLoading,
    error,
    refetch,
    page,
    pageSize,
    status,
    tableLabel,
    guestName,
    createdFrom,
    createdTo,
    setPage,
    setPageSize,
    setStatus,
    setTableLabel,
    setGuestName,
    setCreatedFrom,
    setCreatedTo,
    reset,
  }
}
