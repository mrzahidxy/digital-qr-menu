export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export type OrderItem = {
  itemId?: string | null
  itemNameSnapshot: string
  quantity: number
  priceSnapshot: number
}

export type Order = {
  id: string
  orderRef: string
  businessId: string
  tableLabel?: string | null
  guestName?: string | null
  items: OrderItem[]
  itemCount: number
  status: OrderStatus
  orderNote?: string | null
  createdAt: string
  updatedAt: string
  business: {
    id: string
    name: string
    ownerId: string
  }
}

export type OrderStatusUpdate = {
  status: OrderStatus
}

export type ResourceFilters = {
  status?: OrderStatus | 'all'
  page?: number
  pageSize?: number
  sortBy?: 'tableLabel' | 'status' | 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
  tableLabel?: string
  guestName?: string
  createdFrom?: string
  createdTo?: string
}

export type PaginatedResult<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}
