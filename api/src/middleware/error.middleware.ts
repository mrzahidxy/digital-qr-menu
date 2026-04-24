import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { isHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

export const notFoundHandler = (req: Request, res: Response) => {
  res.locals.errorMessage = `Route ${req.originalUrl} not found`;

  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(error)) {
    res.locals.errorMessage = error.message;
    if (error.details && typeof error.details === 'object' && 'code' in error.details) {
      res.locals.errorCode = String(error.details.code);
    }
    if (error.message === 'Validation failed') {
      res.locals.errorCode = 'VALIDATION_ERROR';
      res.locals.validationDetails = error.details;
    }

    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    res.locals.errorMessage = 'Validation failed';
    res.locals.errorCode = 'VALIDATION_ERROR';
    res.locals.validationDetails = error.flatten();

    return res.status(400).json({
      message: 'Validation failed',
      details: error.flatten(),
    });
  }

  if (error instanceof MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.locals.errorMessage = error.message;
    res.locals.errorCode = error.code;

    return res.status(isFileTooLarge ? 413 : 400).json({
      message: 'File upload validation failed',
      details: {
        code: error.code,
        reason: error.message,
      },
    });
  }

  res.locals.errorMessage = error instanceof Error ? error.message : 'Unhandled error';

  if (error instanceof Error) {
    logger.error(
      {
        err: error,
        method: req.method,
        path: req.originalUrl,
      },
      'Unhandled error'
    );
  } else {
    logger.error({ error, method: req.method, path: req.originalUrl }, 'Unhandled error');
  }

  return res.status(500).json({
    message: 'Internal server error',
  });
};
