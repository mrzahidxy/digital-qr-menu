import { Response } from 'express';

import { HttpError } from '../utils/http-error';
import { adminService } from '../services/admin.service';
import type { AuthenticatedRequest } from '../types/http';

export const adminController = {
  overview: async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.user;

    if (!actor) {
      throw new HttpError(401, 'Unauthorized');
    }

    const overview = await adminService.overview(actor);
    return res.status(200).json(overview);
  },
};
