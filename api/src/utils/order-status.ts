import type { OrderStatus } from '../schemas/order.schema'
import { Prisma } from '@prisma/client'

export const toApiOrderStatus = (value: string): OrderStatus => {
  switch (value) {
    case 'RECEIVED':
    case 'PREPARING':
    case 'READY':
    case 'COMPLETED':
    case 'CANCELLED':
      return value
    default:
      return 'RECEIVED'
  }
}

export const buildOrderStatusTextFilter = (columnName: string, statuses: readonly OrderStatus[]) =>
  Prisma.sql`${Prisma.raw(columnName)}::text IN (${Prisma.join(statuses.map((value) => Prisma.sql`${value}`))})`

export const resolveStoredOrderStatus = async (status: OrderStatus) => status

export const resetOrderStatusEnumValueCache = () => {}
