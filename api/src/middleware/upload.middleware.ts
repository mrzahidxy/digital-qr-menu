import multer from 'multer';

import { ALLOWED_UPLOAD_MIME_TYPES } from '../schemas/upload.schema';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      callback(
        new HttpError(400, 'Unsupported file type', {
          code: 'UPLOAD_UNSUPPORTED_FILE_TYPE',
          allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
        })
      );
      return;
    }

    callback(null, true);
  },
});
