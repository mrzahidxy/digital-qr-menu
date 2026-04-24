import { AuditActorType, Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import type { ClearLogsQuery, ListLogsQuery } from '../schemas/log.schema';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_RETENTION_DAYS = 30;

type LogUserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type RawLogRecord = {
  id: string;
  timestamp: Date;
  level: AuditActorType;
  category: string;
  message: string;
  meta: Prisma.JsonValue | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: null;
  createdAt: Date;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: UserRole | null;
  actorType: AuditActorType;
  entity: string;
  action: string;
};

type LogSummary = {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  meta: Prisma.JsonValue | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: null;
  createdAt: string;
  user: LogUserRecord | null;
  timestampLabel: string;
};

type LogDetail = LogSummary & {
  timestampIso: string;
  createdAtIso: string;
};

export type LogListResponse = {
  data: LogSummary[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  stats: {
    total: number;
    error: number;
    warn: number;
    info: number;
    debug: number;
    topCategories: Array<{ category: string; count: number }>;
  };
};

export type LogDetailResponse = LogDetail;

export type LogOptionsResponse = {
  data: string[];
};

export type ClearLogsResponse = {
  message: string;
  deleted: number;
  retentionDays: number;
};

const normalizePagination = (page?: number, limit?: number) => ({
  page: Number.isFinite(page ?? NaN) && (page ?? 0) > 0 ? Math.floor(page as number) : DEFAULT_PAGE,
  limit: Math.min(
    Number.isFinite(limit ?? NaN) && (limit ?? 0) > 0 ? Math.floor(limit as number) : DEFAULT_LIMIT,
    MAX_LIMIT
  ),
});

const requireAdmin = (actor: AuthenticatedUser) => {
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, 'You do not have permission to manage logs');
  }
};

const actorTypeToLevel = (actorType: AuditActorType) => {
  switch (actorType) {
    case 'SYSTEM':
      return 'DEBUG';
    case 'GUEST':
      return 'WARN';
    case 'USER':
    default:
      return 'INFO';
  }
};

const levelToActorTypes = (level: NonNullable<ListLogsQuery['level']>): AuditActorType[] => {
  switch (level) {
    case 'DEBUG':
      return ['SYSTEM'];
    case 'WARN':
      return ['GUEST'];
    case 'INFO':
      return ['USER'];
    case 'ERROR':
    default:
      return [];
  }
};

const buildWhereClause = (query: ListLogsQuery) => {
  const clauses: Prisma.Sql[] = [];

  if (query.search) {
    const search = `%${query.search}%`;
    clauses.push(Prisma.sql`
      (
        l."action" ILIKE ${search}
        OR l."entity" ILIKE ${search}
        OR COALESCE(l."ip", '') ILIKE ${search}
        OR COALESCE(u."email", '') ILIKE ${search}
        OR COALESCE(u."fullName", '') ILIKE ${search}
        OR COALESCE(l."metadata"::text, '') ILIKE ${search}
      )
    `);
  }

  if (query.level) {
    const actorTypes = levelToActorTypes(query.level);
    if (actorTypes.length === 0) {
      clauses.push(Prisma.sql`1 = 0`);
    } else {
      clauses.push(
        Prisma.sql`l."actorType" IN (${Prisma.join(actorTypes.map((actorType) => Prisma.sql`${actorType}`))})`
      );
    }
  }

  if (query.category) {
    clauses.push(Prisma.sql`l."entity" = ${query.category}`);
  }

  if (query.actorId) {
    clauses.push(Prisma.sql`l."actorId" = ${query.actorId}`);
  }

  if (query.dateFrom) {
    clauses.push(Prisma.sql`l."createdAt" >= ${query.dateFrom}`);
  }

  if (query.dateTo) {
    clauses.push(Prisma.sql`l."createdAt" <= ${query.dateTo}`);
  }

  return clauses.length
    ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`
    : Prisma.sql``;
};

const buildOrderClause = (query: ListLogsQuery) => {
  const sortBy = query.sortBy ?? 'timestamp';
  const sortDirection = query.sortDirection ?? 'desc';
  const direction = sortDirection === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

  switch (sortBy) {
    case 'level':
      return Prisma.sql`ORDER BY ${Prisma.raw('l."actorType"')} ${direction}, l."createdAt" DESC`;
    case 'category':
      return Prisma.sql`ORDER BY ${Prisma.raw('l."entity"')} ${direction}, l."createdAt" DESC`;
    case 'createdAt':
      return Prisma.sql`ORDER BY ${Prisma.raw('l."createdAt"')} ${direction}`;
    case 'timestamp':
    default:
      return Prisma.sql`ORDER BY ${Prisma.raw('l."createdAt"')} ${direction}`;
  }
};

const rawToSummary = (record: RawLogRecord): LogSummary => ({
  id: record.id,
  timestamp: record.timestamp.toISOString(),
  level: actorTypeToLevel(record.actorType),
  category: record.entity,
  message: record.action,
  meta: record.meta,
  userId: record.userId,
  ipAddress: record.ipAddress,
  userAgent: null,
  createdAt: record.createdAt.toISOString(),
  user: record.user_id
    ? {
        id: record.user_id,
        email: record.user_email ?? '',
        name: record.user_name,
        role: record.user_role ?? UserRole.STAFF,
      }
    : null,
  timestampLabel: record.timestamp.toISOString(),
});

const rawToDetail = (record: RawLogRecord): LogDetail => ({
  ...rawToSummary(record),
  timestampIso: record.timestamp.toISOString(),
  createdAtIso: record.createdAt.toISOString(),
});

const fetchLogRows = async (query: ListLogsQuery) => {
  const { page, limit } = normalizePagination(query.page, query.limit);
  const skip = (page - 1) * limit;
  const where = buildWhereClause(query);
  const orderBy = buildOrderClause(query);

  const [rows, totalCountRows, levelRows, categoryRows] = await Promise.all([
    prisma.$queryRaw<RawLogRecord[]>(Prisma.sql`
      SELECT
        l."id",
        l."createdAt" AS "timestamp",
        l."actorType" AS "level",
        l."entity" AS "category",
        l."action" AS "message",
        l."metadata" AS "meta",
        l."actorId" AS "userId",
        l."ip" AS "ipAddress",
        NULL AS "userAgent",
        l."createdAt",
        l."actorType",
        l."entity",
        l."action",
        u."id" AS "user_id",
        u."email" AS "user_email",
        u."fullName" AS "user_name",
        u."role" AS "user_role"
      FROM "audit_logs" l
      LEFT JOIN "users" u ON u."id" = l."actorId"
      ${where}
      ${orderBy}
      OFFSET ${skip}
      LIMIT ${limit}
    `),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "audit_logs" l
      LEFT JOIN "users" u ON u."id" = l."actorId"
      ${where}
    `),
    prisma.$queryRaw<Array<{ level: AuditActorType; count: bigint | number }>>(Prisma.sql`
      SELECT l."actorType" AS "level", COUNT(*)::bigint AS count
      FROM "audit_logs" l
      LEFT JOIN "users" u ON u."id" = l."actorId"
      ${where}
      GROUP BY l."actorType"
    `),
    prisma.$queryRaw<Array<{ category: string; count: bigint | number }>>(Prisma.sql`
      SELECT l."entity" AS "category", COUNT(*)::bigint AS count
      FROM "audit_logs" l
      LEFT JOIN "users" u ON u."id" = l."actorId"
      ${where}
      GROUP BY l."entity"
      ORDER BY COUNT(*) DESC, l."entity" ASC
      LIMIT 5
    `),
  ]);

  const statsByLevel = levelRows.reduce(
    (acc, row) => {
      const level = actorTypeToLevel(row.level);
      acc[level] = Number(row.count);
      return acc;
    },
    { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 } as Record<string, number>
  );

  const totalItems = Number(totalCountRows[0]?.count ?? 0);

  return {
    rows,
    totalItems,
    statsByLevel,
    topCategories: categoryRows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    })),
  };
};

export const logService = {
  list: async (actor: AuthenticatedUser, query: ListLogsQuery): Promise<LogListResponse> => {
    requireAdmin(actor);

    try {
      const { page, limit } = normalizePagination(query.page, query.limit);
      const { rows, totalItems, statsByLevel, topCategories } = await fetchLogRows({
        ...query,
        page,
        limit,
      });

      return {
        data: rows.map(rawToSummary),
        meta: {
          page,
          limit,
          totalItems,
          totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        },
        stats: {
          total: totalItems,
          error: statsByLevel.ERROR,
          warn: statsByLevel.WARN,
          info: statsByLevel.INFO,
          debug: statsByLevel.DEBUG,
          topCategories,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to list logs');
      throw error;
    }
  },

  getById: async (actor: AuthenticatedUser, id: string): Promise<LogDetailResponse> => {
    requireAdmin(actor);

    try {
      const rows = await prisma.$queryRaw<RawLogRecord[]>(Prisma.sql`
        SELECT
          l."id",
          l."createdAt" AS "timestamp",
          l."actorType" AS "level",
          l."entity" AS "category",
          l."action" AS "message",
          l."metadata" AS "meta",
          l."actorId" AS "userId",
          l."ip" AS "ipAddress",
          NULL AS "userAgent",
          l."createdAt",
          l."actorType",
          l."entity",
          l."action",
          u."id" AS "user_id",
          u."email" AS "user_email",
          u."fullName" AS "user_name",
          u."role" AS "user_role"
        FROM "audit_logs" l
        LEFT JOIN "users" u ON u."id" = l."actorId"
        WHERE l."id" = ${id}
        LIMIT 1
      `);

      const record = rows[0];
      if (!record) {
        throw new HttpError(404, 'Log entry not found');
      }

      return rawToDetail(record);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load log details');
      throw error;
    }
  },

  levels: async (actor: AuthenticatedUser): Promise<LogOptionsResponse> => {
    requireAdmin(actor);

    const rows = await prisma.$queryRaw<Array<{ level: string }>>(Prisma.sql`
      SELECT DISTINCT l."actorType" AS "level"
      FROM "audit_logs" l
      ORDER BY l."actorType" ASC
    `);

    return { data: rows.map((row) => row.level) };
  },

  categories: async (actor: AuthenticatedUser): Promise<LogOptionsResponse> => {
    requireAdmin(actor);

    const rows = await prisma.$queryRaw<Array<{ category: string }>>(Prisma.sql`
      SELECT DISTINCT l."entity" AS "category"
      FROM "audit_logs" l
      ORDER BY l."entity" ASC
    `);

    return { data: rows.map((row) => row.category) };
  },

  clearOldLogs: async (
    actor: AuthenticatedUser,
    query: ClearLogsQuery
  ): Promise<ClearLogsResponse> => {
    requireAdmin(actor);

    const retentionDays = query.retentionDays ?? DEFAULT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "audit_logs"
      WHERE "createdAt" < ${cutoff}
    `);

    return {
      message: `Cleared ${result} log entries older than ${retentionDays} days`,
      deleted: Number(result),
      retentionDays,
    };
  },
};
