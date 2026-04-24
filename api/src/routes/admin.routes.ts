import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/overview', requireAuth({ roles: [UserRole.SUPER_ADMIN] }), adminController.overview);

export default router;