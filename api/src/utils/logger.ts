import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import express from 'express';
import pino from 'pino';
import type { TransportSingleOptions } from 'pino';
import pinoHttp from 'pino-http';
import { Prisma } from '@prisma/client';

import { env } from './env';
import { prisma } from './prisma';

type DatabaseLogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type DatabaseLogCategory = 'AUTH' | 'BUSINESS' | 'MENU' | 'ORDER' | 'USER' | 'LICENSE' | 'SYSTEM';

const ALLOWED_LOG_CATEGORIES: readonly DatabaseLogCategory[] = [
  'AUTH',
  'BUSINESS',
  'MENU',
  'ORDER',
  'USER',
  'LICENSE',
  'SYSTEM',
];

type RequestContext = {
  requestId?: string;
  userId?: string | number | null;
  method?: string;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
};

type LogQueueItem = {
  timestamp: Date;
  level: DatabaseLogLevel;
  category: DatabaseLogCategory;
  message: string;
  meta: Record<string, unknown> | null;
  userId: string | number | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

type ResponseLogLocals = {
  errorMessage?: string;
  errorCode?: string;
  validationDetails?: unknown;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

const DEFAULT_LOG_LEVEL = env.NODE_ENV === 'development' ? 'debug' : 'info';
const logLevel = env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL;
const MAX_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 1000;
const SLOW_REQUEST_MS = 1000;
const BANGLADESH_TIME_ZONE = 'Asia/Dhaka';
const BANGLADESH_TIME_OFFSET = '+06:00';

const formatBangladeshTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGLADESH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}:${byType.second}.${milliseconds}${BANGLADESH_TIME_OFFSET}`;
};

const bangladeshTimestamp = () => `,"time":"${formatBangladeshTime()}"`;

let transport: TransportSingleOptions | undefined;

if (env.NODE_ENV === 'development') {
  try {
    require.resolve('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: false,
        customColors: 'debug:blue,info:green,warn:yellow,error:red,fatal:bgRed',
        levelFirst: true,
        messageFormat: '{if event}[{event}] {end}{msg}',
        singleLine: false,
        errorLikeObjectKeys: ['err', 'error'],
        ignore: 'pid,hostname,service,event',
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[logger] pino-pretty not installed, falling back to JSON logs.');
  }
}

const logQueue: LogQueueItem[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isFlushing = false;

const levelMap = (level: number): DatabaseLogLevel => {
  if (level >= 50) return 'ERROR';
  if (level >= 40) return 'WARN';
  if (level >= 30) return 'INFO';
  return 'DEBUG';
};

const serializeError = (value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  return value;
};

const extractLogPayload = (args: unknown[]) => {
  const meta: Record<string, unknown> = {};
  const messages: string[] = [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      messages.push(arg);
      continue;
    }

    if (arg instanceof Error) {
      meta.error = serializeError(arg);
      continue;
    }

    if (typeof arg === 'object' && arg !== null) {
      Object.assign(meta, arg);
      continue;
    }

    if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') {
      messages.push(String(arg));
    }
  }

  const message = messages.join(' ').trim();

  return {
    message: message || 'Log event',
    meta: Object.keys(meta).length > 0 ? meta : null,
  };
};

const deriveCategory = (
  context: RequestContext | undefined,
  message: string,
  meta: Record<string, unknown> | null
): DatabaseLogCategory => {
  const explicitCategory = meta?.category;
  if (typeof explicitCategory === 'string' && explicitCategory.trim()) {
    const normalized = explicitCategory.trim().toUpperCase();
    if (ALLOWED_LOG_CATEGORIES.includes(normalized as DatabaseLogCategory)) {
      return normalized as DatabaseLogCategory;
    }
  }

  const path = context?.path ?? '';
  const normalizedMessage = message.toLowerCase();
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes('/auth') || normalizedMessage.includes('auth')) return 'AUTH';
  if (normalizedPath.includes('/license') || normalizedMessage.includes('license')) return 'LICENSE';
  if (normalizedPath.includes('/business') || normalizedMessage.includes('business')) return 'BUSINESS';
  if (normalizedPath.includes('/menu') || normalizedMessage.includes('menu')) return 'MENU';
  if (normalizedPath.includes('/order') || normalizedMessage.includes('order')) return 'ORDER';
  if (normalizedPath.includes('/user') || normalizedMessage.includes('user')) return 'USER';

  return 'SYSTEM';
};

const enqueueDatabaseLog = (level: number, args: unknown[]) => {
  if (!env.LOG_DB_ENABLED) {
    return;
  }

  const firstArg = args[0];
  if (
    typeof firstArg === 'object' &&
    firstArg !== null &&
    (firstArg as Record<string, unknown>).event === 'http_response'
  ) {
    return;
  }

  const context = requestContext.getStore();
  const { message, meta } = extractLogPayload(args);

  logQueue.push({
    timestamp: new Date(),
    level: levelMap(level),
    category: deriveCategory(context, message, meta),
    message,
    meta: {
      ...(meta ?? {}),
      requestId: context?.requestId ?? null,
      method: context?.method ?? null,
      path: context?.path ?? null,
    },
    userId: context?.userId ?? null,
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
    requestId: context?.requestId ?? null,
  });

  if (logQueue.length >= MAX_BATCH_SIZE) {
    void flushLogQueue();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushLogQueue();
    }, FLUSH_INTERVAL_MS);

    flushTimer.unref();
  }
};

const flushLogQueue = async () => {
  if (!env.LOG_DB_ENABLED || isFlushing || logQueue.length === 0) {
    return;
  }

  isFlushing = true;

  try {
    while (logQueue.length > 0) {
      const batch = logQueue.splice(0, MAX_BATCH_SIZE);
      const values = batch.map((entry) =>
        Prisma.sql`(${randomUUID()}, CAST(${entry.userId ? 'USER' : 'SYSTEM'} AS "AuditActorType"), ${entry.category}, ${entry.message}, ${
          entry.meta ? JSON.stringify(entry.meta) : null
        }::jsonb, ${entry.userId ? String(entry.userId) : null}, ${entry.ipAddress}, ${entry.timestamp})`
      );

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "audit_logs" (
          "id",
          "actorType",
          "entity",
          "action",
          "metadata",
          "actorId",
          "ip",
          "createdAt"
        ) VALUES ${Prisma.join(values)}
      `);
    }
  } catch {
    // Best-effort sink only. Never allow DB logging to break the request path.
  } finally {
    isFlushing = false;
  }
};

void setInterval(() => {
  void flushLogQueue();
}, FLUSH_INTERVAL_MS).unref();

export const logger = pino({
  level: logLevel,
  base: { service: env.APP_NAME },
  timestamp: bangladeshTimestamp,
  redact: {
    paths: [
      'authorization',
      'req.headers.authorization',
      'headers.authorization',
      'password',
      'token',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
  transport,
  hooks: {
    logMethod(args, method, level) {
      const context = requestContext.getStore();
      const firstArg = args[0];
      const isPinoHttpAutoLog =
        typeof firstArg === 'object' &&
        firstArg !== null &&
        ('reqId' in (firstArg as Record<string, unknown>) ||
          'responseTime' in (firstArg as Record<string, unknown>));

      if (context?.requestId && !isPinoHttpAutoLog) {
        if (args.length === 0) {
          args.push({ requestId: context.requestId });
        } else if (typeof args[0] === 'object' && args[0] !== null) {
          const firstArgObject = args[0] as Record<string, unknown>;
          if (!firstArgObject.requestId) {
            firstArgObject.requestId = context.requestId;
          }
        } else {
          args.unshift({ requestId: context.requestId });
        }
      }

      enqueueDatabaseLog(level, args);
      // eslint-disable-next-line prefer-spread
      return method.apply(this, args as unknown as Parameters<typeof method>);
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: env.NODE_ENV === 'test' ? false : true,
  quietReqLogger: true,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  serializers: {
    req() {
      return undefined;
    },
    res() {
      return undefined;
    },
  },
  genReqId(req) {
    const expressReq = req as express.Request;
    if (expressReq.id) {
      return expressReq.id;
    }
    const generated = randomUUID();
    expressReq.id = generated;
    return generated;
  },
  customSuccessMessage(req, res, responseTime) {
    const elapsed = Math.round(responseTime);
    const expressReq = req as express.Request;
    const context = requestContext.getStore();
    const requestId = expressReq.id ?? context?.requestId;
    const userId = context?.userId;
    const userPart = userId ? ` userId=${userId}` : '';
    const slowPart = elapsed >= SLOW_REQUEST_MS ? ' SLOW' : '';

    return `[http] ${req.method} ${expressReq.originalUrl ?? req.url} -> ${res.statusCode} ${elapsed}ms requestId=${requestId ?? '-'}${userPart}${slowPart}`;
  },
  customErrorMessage(req, res, error) {
    const status = res.statusCode;
    const expressReq = req as express.Request;
    const context = requestContext.getStore();
    const requestId = expressReq.id ?? context?.requestId;
    const userId = context?.userId;
    const userPart = userId ? ` userId=${userId}` : '';

    return `[http] ${req.method} ${expressReq.originalUrl ?? req.url} -> ${status} requestId=${requestId ?? '-'}${userPart} error="${error.message}"`;
  },
  customSuccessObject(req, res, value) {
    const expressReq = req as express.Request;
    const expressRes = res as express.Response;
    const context = requestContext.getStore();
    const locals = expressRes.locals as ResponseLogLocals;
    const durationMs = Math.round(Number(value.responseTime ?? 0));

    return {
      ...value,
      event: 'http_response',
      requestId: expressReq.id ?? context?.requestId,
      userId: context?.userId ?? null,
      method: req.method,
      path: expressReq.originalUrl ?? req.url,
      status: res.statusCode,
      durationMs,
      slow: durationMs >= SLOW_REQUEST_MS,
      errorMessage: locals.errorMessage,
      errorCode: locals.errorCode,
      validationDetails: locals.validationDetails,
    };
  },
  customErrorObject(req, res, error, value) {
    const expressReq = req as express.Request;
    const context = requestContext.getStore();
    const durationMs = Math.round(Number(value.responseTime ?? 0));

    return {
      ...value,
      event: 'http_response',
      requestId: expressReq.id ?? context?.requestId,
      userId: context?.userId ?? null,
      method: req.method,
      path: expressReq.originalUrl ?? req.url,
      status: res.statusCode,
      durationMs,
      slow: durationMs >= SLOW_REQUEST_MS,
      error: {
        message: error.message,
      },
    };
  },
});

export const extendRequestContext = (patch: Partial<RequestContext>) => {
  const context = requestContext.getStore();
  if (!context) {
    return;
  }

  Object.assign(context, patch);
};

// Middleware to add request ID and request metadata to logger context
export const loggerWithRequestContext = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) => {
  const context: RequestContext = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };

  requestContext.run(context, () => {
    next();
  });
};
