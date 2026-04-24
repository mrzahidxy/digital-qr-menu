import 'dotenv/config';

import { z } from 'zod';
import { SERVER_BRANDING } from '../config/branding';

const envSchema = z.object({
  APP_NAME: z.string().default(SERVER_BRANDING.appName),
  APP_DESCRIPTION: z
    .string()
    .default(SERVER_BRANDING.appDescription),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  LOG_DB_ENABLED: z.coerce.boolean().default(true),
  PRISMA_QUERY_LOG: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be at least 16 characters long'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default('refreshToken'),
  REFRESH_TOKEN_COOKIE_PATH: z.string().default('/api'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  JWT_ISSUER: z.string().default(SERVER_BRANDING.jwtIssuer),
  JWT_AUDIENCE: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MAX_UPLOAD_SIZE: z.coerce.number().default(5 * 1024 * 1024),
  TRUST_PROXY: z.coerce.boolean().default(false),
  RUN_MIGRATIONS_ON_STARTUP: z.coerce.boolean().default(false),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
