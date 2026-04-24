import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { licenseController } from '../controllers/license.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createLicenseSchema,
  licenseIdParamSchema,
  listLicensesQuerySchema,
  updateLicenseSchema,
} from '../schemas/license.schema';

const router = Router();

router.get(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN, UserRole.OWNER] }),
  validateRequest(listLicensesQuerySchema, 'query'),
  licenseController.list
);

router.get(
  '/:id',
  requireAuth({ roles: [UserRole.SUPER_ADMIN, UserRole.OWNER] }),
  validateRequest(licenseIdParamSchema, 'params'),
  licenseController.getById
);

router.post(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(createLicenseSchema),
  licenseController.create
);

router.put(
  '/:id',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(licenseIdParamSchema, 'params'),
  validateRequest(updateLicenseSchema),
  licenseController.update
);

router.delete(
  '/:id',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(licenseIdParamSchema, 'params'),
  licenseController.remove
);

export default router;