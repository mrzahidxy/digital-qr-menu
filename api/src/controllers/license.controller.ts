import { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../types/http';
import { logger } from '../utils/logger';
import { licenseService } from '../services/license.service';
import type {
  CreateLicenseInput,
  ListLicensesQuery,
  UpdateLicenseInput,
} from '../schemas/license.schema';

export const licenseController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListLicensesQuery;
      const result = await licenseService.list(req.user, query);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle license list request');
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as { id: string };
      const license = await licenseService.getById(req.user, id);
      res.status(200).json(license);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle license detail request');
      next(error);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as CreateLicenseInput;
      const license = await licenseService.create(req.user, payload);
      res.status(201).json({
        message: 'License created successfully',
        license,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create license');
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as { id: string };
      const payload = req.body as UpdateLicenseInput;
      const license = await licenseService.update(req.user, id, payload);
      res.status(200).json({
        message: 'License updated successfully',
        license,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update license');
      next(error);
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as { id: string };
      await licenseService.remove(req.user, id);
      res.status(200).json({
        message: 'License deleted successfully',
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete license');
      next(error);
    }
  },
};
