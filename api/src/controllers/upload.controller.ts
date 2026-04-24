import { NextFunction, Response } from 'express';

import { uploadService } from '../services/upload.service';
import type { AuthenticatedRequest } from '../types/http';
import { HttpError } from '../utils/http-error';

export const uploadController = {
  uploadFile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new HttpError(400, 'File is required', {
          code: 'UPLOAD_FILE_REQUIRED',
        });
      }

      const upload = await uploadService.uploadImage(req.file);

      return res.status(201).json({
        message: 'File uploaded successfully',
        upload,
      });
    } catch (error) {
      return next(error);
    }
  },
};
