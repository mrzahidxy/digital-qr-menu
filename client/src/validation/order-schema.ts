import { z } from 'zod'

export const orderSchema = z.object({
  guestName: z.string().trim().min(1, 'Guest name is required'),
  tableLabel: z.string().trim().min(1, 'Table label is required'),
  orderNote: z.string().trim().min(1, 'Order note is required'),
})

export type OrderFormValues = z.infer<typeof orderSchema>

export const orderStatusSchema = z.enum([
  'RECEIVED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
])

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema,
})
