import { Router } from 'express';

import authRoutes from './auth.routes';
import orderRoutes from './order.routes';
import userRoutes from './user.routes';
import logRoutes from './log.routes';
import licenseRoutes from './license.routes';
import businessRoutes from './business.routes';
import adminBusinessRoutes from './admin.business.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/businesses', businessRoutes);
router.use('/users', userRoutes);
router.use('/logs', logRoutes);
router.use('/licenses', licenseRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin/businesses', adminBusinessRoutes);
router.use('/admin', adminRoutes);

export default router;
