import { Router } from 'express';

import { businessController } from '../controllers/business.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  businessIdParamSchema,
  menuIdParamSchema,
  categoryParamsSchema,
  itemParamsSchema,
  businessUserParamsSchema,
  updateBusinessSchema,
  assignBusinessUserSchema,
  businessWorkspaceQuerySchema,
  createMenuSchema,
  updateMenuSchema,
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  upsertQrSettingsSchema,
  updateBusinessBrandingSchema,
} from '../schemas/business.schema';

const router = Router();

router.get(
  '/:businessId',
  requireAuth({ permissions: ['BUSINESS_READ_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.getById
);

router.patch(
  '/:businessId',
  requireAuth({ permissions: ['BUSINESS_UPDATE_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(updateBusinessSchema),
  businessController.update
);

router.get(
  '/:businessId/workspace',
  requireAuth({ permissions: ['BUSINESS_READ_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(businessWorkspaceQuerySchema, 'query'),
  businessController.getWorkspace
);

router.get(
  '/:businessId/branding',
  requireAuth({ permissions: ['BUSINESS_READ_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.getBranding
);

router.put(
  '/:businessId/branding',
  requireAuth({ permissions: ['BUSINESS_UPDATE_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(updateBusinessBrandingSchema),
  businessController.updateBranding
);

router.get(
  '/:businessId/qr',
  requireAuth({ permissions: ['BUSINESS_READ_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.getQrSettings
);

router.put(
  '/:businessId/qr',
  requireAuth({ permissions: ['BUSINESS_UPDATE_OWN'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(upsertQrSettingsSchema),
  businessController.upsertQrSettings
);

router.get(
  '/:businessId/menus',
  requireAuth({ permissions: ['MENU_READ'] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.listMenus
);

router.post(
  '/:businessId/menus',
  requireAuth({ permissions: ['MENU_CREATE'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(createMenuSchema),
  businessController.createMenu
);

router.patch(
  '/:businessId/menus/:menuId',
  requireAuth({ permissions: ['MENU_UPDATE'] }),
  validateRequest(menuIdParamSchema, 'params'),
  validateRequest(updateMenuSchema),
  businessController.updateMenu
);

router.delete(
  '/:businessId/menus/:menuId',
  requireAuth({ permissions: ['MENU_DELETE'] }),
  validateRequest(menuIdParamSchema, 'params'),
  businessController.deleteMenu
);

router.get(
  '/:businessId/menus/:menuId/categories',
  requireAuth({ permissions: ['MENU_READ'] }),
  validateRequest(menuIdParamSchema, 'params'),
  businessController.listCategories
);

router.post(
  '/:businessId/menus/:menuId/categories',
  requireAuth({ permissions: ['MENU_CREATE'] }),
  validateRequest(menuIdParamSchema, 'params'),
  validateRequest(createCategorySchema),
  businessController.createCategory
);

router.patch(
  '/:businessId/menus/:menuId/categories/:categoryId',
  requireAuth({ permissions: ['MENU_UPDATE'] }),
  validateRequest(categoryParamsSchema, 'params'),
  validateRequest(updateCategorySchema),
  businessController.updateCategory
);

router.delete(
  '/:businessId/menus/:menuId/categories/:categoryId',
  requireAuth({ permissions: ['MENU_DELETE'] }),
  validateRequest(categoryParamsSchema, 'params'),
  businessController.deleteCategory
);

router.get(
  '/:businessId/menus/:menuId/categories/:categoryId/items',
  requireAuth({ permissions: ['MENU_READ'] }),
  validateRequest(categoryParamsSchema, 'params'),
  businessController.listItems
);

router.post(
  '/:businessId/menus/:menuId/categories/:categoryId/items',
  requireAuth({ permissions: ['MENU_CREATE'] }),
  validateRequest(categoryParamsSchema, 'params'),
  validateRequest(createItemSchema),
  businessController.createItem
);

router.patch(
  '/:businessId/menus/:menuId/categories/:categoryId/items/:itemId',
  requireAuth({ permissions: ['MENU_UPDATE'] }),
  validateRequest(itemParamsSchema, 'params'),
  validateRequest(updateItemSchema),
  businessController.updateItem
);

router.delete(
  '/:businessId/menus/:menuId/categories/:categoryId/items/:itemId',
  requireAuth({ permissions: ['MENU_DELETE'] }),
  validateRequest(itemParamsSchema, 'params'),
  businessController.deleteItem
);

router.get(
  '/:businessId/staff',
  requireAuth({ permissions: ['BUSINESS_MANAGE_STAFF'] }),
  validateRequest(businessIdParamSchema, 'params'),
  businessController.listBusinessUsers
);

router.post(
  '/:businessId/staff',
  requireAuth({ permissions: ['BUSINESS_MANAGE_STAFF'] }),
  validateRequest(businessIdParamSchema, 'params'),
  validateRequest(assignBusinessUserSchema),
  businessController.assignBusinessUser
);

router.delete(
  '/:businessId/staff/:userId',
  requireAuth({ permissions: ['BUSINESS_MANAGE_STAFF'] }),
  validateRequest(businessUserParamsSchema, 'params'),
  businessController.removeBusinessUser
);

export default router;
