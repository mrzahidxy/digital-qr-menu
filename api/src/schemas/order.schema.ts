import { z } from 'zod'

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export const orderStatusValues = ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const
export const orderStatusSchema = z.enum(orderStatusValues)

export const orderItemSnapshotSchema = z.object({
  itemId: z.string().trim().min(1).max(64).nullable().optional(),
  itemNameSnapshot: z.string().trim().min(1, 'Item name is required').max(120),
  quantity: z.coerce.number().int().positive(),
  priceSnapshot: z.coerce.number().nonnegative(),
})

export const publicOrderItemSchema = z.object({
  itemId: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).max(64)),
  quantity: z.coerce.number().int().positive(),
})

const publicLookupBaseSchema = z.object({
  businessId: z.string().uuid(),
})

const publicLookupSchema = publicLookupBaseSchema

export const createPublicOrderSchema = publicLookupBaseSchema
  .extend({
    guestName: z.preprocess(emptyStringToNull, z.string().trim().max(120).nullable().optional()),
    tableLabel: z.preprocess(emptyStringToNull, z.string().trim().max(50).nullable().optional()),
    orderNote: z.preprocess(emptyStringToNull, z.string().trim().max(500).nullable().optional()),
    items: z.array(publicOrderItemSchema).min(1, 'At least one item is required'),
  })
  .transform((value) => ({
    businessId: value.businessId,
    guestName: value.guestName ?? null,
    tableLabel: value.tableLabel ?? null,
    orderNote: value.orderNote ?? null,
    items: value.items,
  }))

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
})

export const listOrdersQuerySchema = z
  .object({
    status: z.preprocess(
      (value) => {
        if (typeof value === 'string') {
          return value
            .split(',')
            .map((candidate) => candidate.trim())
            .filter(Boolean)
        }
        return value
      },
      z.array(orderStatusSchema).optional()
    ),
    tableLabel: z.preprocess(emptyStringToUndefined, z.string().trim().max(50).optional()),
    guestName: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    sortBy: z.enum(['tableLabel', 'status', 'createdAt', 'updatedAt']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  })

export const orderIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const orderRefParamSchema = z.object({
  orderRef: z.string().trim().min(4).max(32),
})

export const publicMenuQuerySchema = publicLookupSchema

export type OrderStatus = z.infer<typeof orderStatusSchema>
export type OrderItemSnapshot = z.infer<typeof orderItemSnapshotSchema>
export type PublicOrderItemInput = z.infer<typeof publicOrderItemSchema>
export type CreatePublicOrderInput = z.infer<typeof createPublicOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>
export type PublicMenuQuery = z.infer<typeof publicMenuQuerySchema>
