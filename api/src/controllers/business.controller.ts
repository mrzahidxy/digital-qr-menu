import { NextFunction, Response } from 'express';

import { businessService } from '../services/business.service';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreateBusinessInput,
  ListBusinessesQueryInput,
  UpdateBusinessInput,
  AssignBusinessUserInput,
  BusinessWorkspaceQueryInput,
  CreateMenuInput,
  UpdateMenuInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateItemInput,
  UpdateItemInput,
  UpsertQrSettingsInput,
  UpdateBusinessBrandingInput,
} from '../schemas/business.schema';
import { businessWorkspaceQuerySchema } from '../schemas/business.schema';

export const businessController = {
  adminList: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListBusinessesQueryInput;
      const result = await businessService.listForAdmin(req.user, query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  adminGetById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const business = await businessService.getByIdForAdmin(req.user, businessId);
      res.status(200).json(business);
    } catch (error) {
      next(error);
    }
  },

  adminCreate: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as CreateBusinessInput;
      const business = await businessService.create(payload, req.user);
      res.status(201).json({
        message: 'Business created successfully',
        business,
      });
    } catch (error) {
      next(error);
    }
  },

  adminUpdate: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as UpdateBusinessInput;
      const business = await businessService.update(businessId, payload, req.user);
      res.status(200).json({
        message: 'Business updated successfully',
        business,
      });
    } catch (error) {
      next(error);
    }
  },

  adminRemove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      await businessService.removeForAdmin(req.user, businessId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const business = await businessService.getById(businessId, req.user);
      res.status(200).json(business);
    } catch (error) {
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as UpdateBusinessInput;
      const business = await businessService.update(businessId, payload, req.user);
      res.status(200).json({
        message: 'Business updated successfully',
        business,
      });
    } catch (error) {
      next(error);
    }
  },

  getBranding: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const branding = await businessService.getBranding(businessId, req.user);
      res.status(200).json(branding);
    } catch (error) {
      next(error);
    }
  },

  updateBranding: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as UpdateBusinessBrandingInput;
      const branding = await businessService.updateBranding(businessId, payload, req.user);
      res.status(200).json({
        message: 'Branding updated successfully',
        branding,
      });
    } catch (error) {
      next(error);
    }
  },

  getQrSettings: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const qr = await businessService.getQrSettings(businessId, req.user);
      res.status(200).json(qr);
    } catch (error) {
      next(error);
    }
  },

  upsertQrSettings: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as UpsertQrSettingsInput;
      const qr = await businessService.upsertQrSettings(businessId, payload, req.user);
      res.status(200).json({
        message: 'QR settings updated successfully',
        qr,
      });
    } catch (error) {
      next(error);
    }
  },

  getWorkspace: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const query = businessWorkspaceQuerySchema.parse(req.query) as BusinessWorkspaceQueryInput;
      const workspace = await businessService.getWorkspace(businessId, req.user, query);
      res.status(200).json(workspace);
    } catch (error) {
      next(error);
    }
  },

  listMenus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const menus = await businessService.listMenus(businessId, req.user);
      res.status(200).json(menus);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle menu list request');
      next(error);
    }
  },

  createMenu: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as CreateMenuInput;
      const menu = await businessService.createMenu(businessId, payload, req.user);
      res.status(201).json({
        message: 'Menu created successfully',
        menu,
      });
    } catch (error) {
      next(error);
    }
  },

  updateMenu: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId } = req.params as { businessId: string; menuId: string };
      const payload = req.body as UpdateMenuInput;
      const menu = await businessService.updateMenu(businessId, menuId, payload, req.user);
      res.status(200).json({
        message: 'Menu updated successfully',
        menu,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteMenu: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId } = req.params as { businessId: string; menuId: string };
      await businessService.deleteMenu(businessId, menuId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  listCategories: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId } = req.params as { businessId: string; menuId: string };
      const categories = await businessService.listCategories(businessId, menuId, req.user);
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  },

  createCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId } = req.params as { businessId: string; menuId: string };
      const payload = req.body as CreateCategoryInput;
      const category = await businessService.createCategory(businessId, menuId, payload, req.user);
      res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      next(error);
    }
  },

  updateCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
      };
      const payload = req.body as UpdateCategoryInput;
      const category = await businessService.updateCategory(
        businessId,
        menuId,
        categoryId,
        payload,
        req.user
      );
      res.status(200).json({
        message: 'Category updated successfully',
        category,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
      };
      await businessService.deleteCategory(businessId, menuId, categoryId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  listItems: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
      };
      const items = await businessService.listItems(businessId, menuId, categoryId, req.user);
      res.status(200).json(items);
    } catch (error) {
      next(error);
    }
  },

  createItem: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
      };
      const payload = req.body as CreateItemInput;
      const item = await businessService.createItem(businessId, menuId, categoryId, payload, req.user);
      res.status(201).json({
        message: 'Item created successfully',
        item,
      });
    } catch (error) {
      next(error);
    }
  },

  updateItem: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId, itemId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
        itemId: string;
      };
      const payload = req.body as UpdateItemInput;
      const item = await businessService.updateItem(
        businessId,
        menuId,
        categoryId,
        itemId,
        payload,
        req.user
      );
      res.status(200).json({
        message: 'Item updated successfully',
        item,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteItem: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, menuId, categoryId, itemId } = req.params as {
        businessId: string;
        menuId: string;
        categoryId: string;
        itemId: string;
      };
      await businessService.deleteItem(businessId, menuId, categoryId, itemId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  listBusinessUsers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const users = await businessService.listBusinessUsers(businessId, req.user);
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  assignBusinessUser: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId } = req.params as { businessId: string };
      const payload = req.body as AssignBusinessUserInput;
      const assignment = await businessService.assignBusinessUser(businessId, payload, req.user);
      res.status(201).json({
        message: 'Business user assigned successfully',
        assignment,
      });
    } catch (error) {
      next(error);
    }
  },

  removeBusinessUser: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { businessId, userId } = req.params as { businessId: string; userId: string };
      await businessService.removeBusinessUser(businessId, userId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
