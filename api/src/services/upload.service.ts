import { randomUUID } from 'crypto';

import { uploadFileMetadataSchema } from '../schemas/upload.schema';
import { uploadBufferToCloudinary } from '../utils/cloudinary';
import { HttpError } from '../utils/http-error';

export type UploadedAsset = {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
};

export const uploadService = {
  uploadImage: async (file: Express.Multer.File): Promise<UploadedAsset> => {
    const parsedFile = uploadFileMetadataSchema.safeParse({
      mimetype: file.mimetype,
      size: file.size,
    });

    if (!parsedFile.success) {
      throw new HttpError(400, 'File upload validation failed', {
        code: 'UPLOAD_VALIDATION_FAILED',
        errors: parsedFile.error.flatten().fieldErrors,
      });
    }

    let result;
    try {
      result = await uploadBufferToCloudinary(file.buffer, {
        folder: 'digital-menu/uploads',
        resource_type: 'image',
        public_id: randomUUID(),
      });
    } catch (error) {
      throw new HttpError(503, 'Upload storage is unavailable', {
        code: 'UPLOAD_STORAGE_UNAVAILABLE',
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
    };
  },
};
