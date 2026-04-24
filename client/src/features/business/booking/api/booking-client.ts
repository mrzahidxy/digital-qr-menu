'use client'

import { apiClient } from '@/lib/api'

import type { Order, OrderStatusUpdate, PaginatedResult, ResourceFilters } from '@/types/order'

type ApiResponse<T> = {
  message?: string
} & T

export async function fetchOrders(
  filters: Partial<ResourceFilters>
): Promise<PaginatedResult<Order>> {
  const query = {
    ...filters,
    limit: filters.pageSize ?? 10,
  }
  delete (query as { pageSize?: number }).pageSize

  return apiClient.get('/api/v1/orders', {
    query,
    cache: 'no-store',
    auth: true,
  })
}

export async function updateOrderStatusRequest(id: string, input: OrderStatusUpdate) {
  return apiClient.patch<ApiResponse<{ order: Order }>>(
    `/api/v1/orders/${id}/status`,
    input,
    { auth: true }
  )
}

export async function getOrderById(id: string | number) {
  return apiClient.get<Order>(`/api/v1/orders/${id}`, {
    auth: true,
  })
}
