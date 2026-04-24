import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { env } from './utils/env';
import { httpLogger, logger, loggerWithRequestContext } from './utils/logger';
import { prisma } from './utils/prisma';
import { cache } from './utils/cache';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { serve, setup, swaggerSpec, swaggerUiOptions } from './middleware/swagger.middleware';
import uploadRoutes from './routes/upload.routes';

const app = express();

const trustProxySetting = env.TRUST_PROXY ? 1 : false;
app.set('trust proxy', trustProxySetting);

// Request/response tracing
app.use(requestIdMiddleware);
app.use(loggerWithRequestContext);
app.use(httpLogger);
app.use(cookieParser());

const corsOrigins =
  env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

const isAllowedDevLoopbackOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    const isLoopbackHost =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';

    return isLoopbackHost && (url.protocol === 'http:' || url.protocol === 'https:');
  } catch {
    return false;
  }
};

// Security and performance middleware
const limiterOptions: Partial<RateLimitOptions> & { trustProxy?: boolean } = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: Boolean(trustProxySetting),
};

const limiter = rateLimit(limiterOptions);

app.use(limiter);
app.use(helmet());
const corsOptions = {
  origin: corsOrigins === true
    ? true
    : (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (corsOrigins.includes(origin) || isAllowedDevLoopbackOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS policy does not allow origin: ${origin}`));
      },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept', 'Origin'] as string[],
  optionsSuccessStatus: 204,
} as const;

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const services: { database: 'up' | 'down'; cache: 'up' | 'down' } = {
    database: 'up',
    cache: cache.isConnectedToRedis() ? 'up' : 'down',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    services.database = 'down';
    res.status(503).json({
      status: 'error',
      timestamp,
      uptime,
      services,
      error: 'Database connection failed',
    });
    return;
  }

  const status = services.cache === 'up' ? 'ok' : 'degraded';

  res.status(200).json({
    status,
    timestamp,
    uptime,
    services,
  });
});

// Swagger documentation
app.use('/api-docs', serve, setup(swaggerSpec, swaggerUiOptions));

// API versioning
app.use('/upload', uploadRoutes);
app.use('/api/v1', routes);
app.use('/api', routes); // Backward compatibility

app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

export default app;
