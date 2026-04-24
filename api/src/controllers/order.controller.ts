import type { CreatePublicOrderInput, ListOrdersQuery, PublicMenuQuery, UpdateOrderStatusInput } from '../schemas/order.schema'
import { listOrdersQuerySchema, publicMenuQuerySchema } from '../schemas/order.schema'
import { orderService } from '../services/order.service'
import { logger } from '../utils/logger'

export const orderController = {
  publicMenu: async (req: any, res: any) => {
    try {
      const query = publicMenuQuerySchema.parse(req.query) as PublicMenuQuery
      const menu = await orderService.getPublicMenu(query)
      res.status(200).json(menu)
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle public menu request')
      throw error
    }
  },

  publicCreate: async (req: any, res: any) => {
    try {
      const payload = req.body as CreatePublicOrderInput
      const order = await orderService.createPublic(payload)
      res.status(201).json(order)
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle public order create request')
      throw error
    }
  },

  list: async (req: any, res: any) => {
    try {
      const query = listOrdersQuerySchema.parse(req.query) as ListOrdersQuery
      const page = Number(query.page ?? 1)
      const limit = Number(query.limit ?? 10)
      const orders = await orderService.list(req.user, page, limit, query)
      res.status(200).json(orders)
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle order list request')
      throw error
    }
  },

  getById: async (req: any, res: any) => {
    try {
      const orderId = req.params.id
      const order = await orderService.getById(orderId, req.user)
      res.status(200).json(order)
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle order detail request')
      throw error
    }
  },

  updateStatus: async (req: any, res: any) => {
    try {
      const orderId = req.params.id
      const payload = req.body as UpdateOrderStatusInput
      const order = await orderService.updateStatus(orderId, payload, req.user!)
      res.status(200).json({
        message: 'Order status updated successfully',
        order,
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle order status update request')
      throw error
    }
  },
}
