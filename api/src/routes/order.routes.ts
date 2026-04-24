import { UserRole } from '@prisma/client'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { orderController } from '../controllers/order.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation.middleware'
import {
  createPublicOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  publicMenuQuerySchema,
  updateOrderStatusSchema,
} from '../schemas/order.schema'

const router = Router()
const publicOrderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many public order attempts from this IP, please try again shortly.',
  },
})

router.get('/public/menu', validateRequest(publicMenuQuerySchema, 'query'), orderController.publicMenu)
router.post('/public', publicOrderLimiter, validateRequest(createPublicOrderSchema), orderController.publicCreate)

router.get(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.STAFF] }),
  validateRequest(listOrdersQuerySchema, 'query'),
  orderController.list
)
router.get(
  '/:id',
  requireAuth({ roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.STAFF] }),
  validateRequest(orderIdParamSchema, 'params'),
  orderController.getById
)
router.patch(
  '/:id/status',
  requireAuth({ roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.STAFF] }),
  validateRequest(orderIdParamSchema, 'params'),
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
)

export default router
