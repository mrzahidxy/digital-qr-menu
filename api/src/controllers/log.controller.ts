import { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../types/http';
import { logger } from '../utils/logger';
import { logService } from '../services/log.service';
import type { ClearLogsQuery, ListLogsQuery } from '../schemas/log.schema';

export const logController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListLogsQuery;
      const result = await logService.list(req.user, query);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle log list request');
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as { id: string };
      const logEntry = await logService.getById(req.user, id);
      res.status(200).json(logEntry);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle log detail request');
      next(error);
    }
  },

  levels: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await logService.levels(req.user);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle log levels request');
      next(error);
    }
  },

  categories: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await logService.categories(req.user);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle log categories request');
      next(error);
    }
  },

  clearOldLogs: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ClearLogsQuery;
      const result = await logService.clearOldLogs(req.user, query);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear old logs');
      next(error);
    }
  },
};
