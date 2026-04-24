import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { businessController } from '../controllers/business.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createBusinessSchema,
  listBusinessesQuerySchema,
  businessIdParamSchema,
  updateBusinessSchema,
} from '../schemas/business.schema';

const router = Router();

router.get(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(listBusinessesQuerySchema, 'query'),
  businessController.adminList
);

router.get(
  '/:businessId',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.adminGetById
);

router.post(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(createBusinessSchema),
  businessController.adminCreate
);

router.patch(
  '/:businessId',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(updateBusinessSchema),
  businessController.adminUpdate
);

router.delete(
  '/:businessId',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.adminRemove
);

export default router;
