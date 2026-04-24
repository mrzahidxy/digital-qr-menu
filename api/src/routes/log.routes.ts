import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { logController } from '../controllers/log.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  clearLogsQuerySchema,
  logIdParamSchema,
  listLogsQuerySchema,
} from '../schemas/log.schema';

const router = Router();

router.get(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(listLogsQuerySchema, 'query'),
  logController.list
);

router.get(
  '/levels',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  logController.levels
);

router.get(
  '/categories',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  logController.categories
);

router.get(
  '/:id',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(logIdParamSchema, 'params'),
  logController.getById
);

router.delete(
  '/',
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(clearLogsQuerySchema, 'query'),
  logController.clearOldLogs
);

export default router;