import { z } from 'zod';

import { env } from '../utils/env';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const uploadFileMetadataSchema = z.object({
  mimetype: z.enum(ALLOWED_UPLOAD_MIME_TYPES, {
    errorMap: () => ({ message: 'Unsupported file type' }),
  }),
  size: z.number().int().positive().max(env.MAX_UPLOAD_SIZE, 'File exceeds maximum upload size'),
});

export type UploadFileMetadataInput = z.infer<typeof uploadFileMetadataSchema>;
