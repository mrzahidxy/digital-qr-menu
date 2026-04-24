import { AuditActorType, Prisma, UserRole } from '@prisma/client';

import { cache } from '../utils/cache';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import type { AuthenticatedUser } from '../types/user';

const OVERVIEW_CACHE_KEY = 'admin:overview';
const OVERVIEW_CACHE_TTL_SECONDS = 30;
const OVERVIEW_RECENT_ACTIVITY_LIMIT = 5;
const OVERVIEW_CHART_DAYS = 7;

type OverviewChartPoint = {
  date: string;
  calls: number;
};

type OverviewRecentActivity = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  actorType: AuditActorType;
  metadata: Prisma.JsonValue | null;
  actor: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

const mapRecentActivity = (log: {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  actorType: AuditActorType;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  actor: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
}): OverviewRecentActivity => ({
  id: log.id,
  createdAt: log.createdAt.toISOString(),
  action: log.action,
  entity: log.entity,
  entityId: log.entityId,
  actorId: log.actorId,
  actorType: log.actorType,
  metadata: log.metadata,
  actor: log.actor
    ? {
        id: log.actor.id,
        email: log.actor.email,
        fullName: log.actor.fullName,
      }
    : null,
});

export type AdminOverviewResponse = {
  totalBusinesses: number;
  activeUsers: number;
  storageUsed: string;
  storageUsedBytes: number;
  menusPublished: number;
  apiCallsCount: number;
  apiCallsData: OverviewChartPoint[];
  recentActivity: OverviewRecentActivity[];
  lastUpdated: string;
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = value >= 10 || exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10;

  return `${rounded} ${units[exponent]}`;
};

const buildChartWindow = (): Date => {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (OVERVIEW_CHART_DAYS - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const buildChartSeries = (rows: Array<{ date: string; calls: bigint | number }>): OverviewChartPoint[] => {
  const lookup = new Map(rows.map((row) => [row.date, Number(row.calls)]));
  const start = buildChartWindow();
  const series: OverviewChartPoint[] = [];

  for (let index = 0; index < OVERVIEW_CHART_DAYS; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const key = current.toISOString().slice(0, 10);

    series.push({
      date: key,
      calls: lookup.get(key) ?? 0,
    });
  }

  return series;
};

const requireAdmin = (actor: AuthenticatedUser) => {
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, 'You do not have permission to view the admin overview');
  }
};

export const adminService = {
  overview: async (actor: AuthenticatedUser): Promise<AdminOverviewResponse> => {
    requireAdmin(actor);

    const redisConnected = cache.isConnectedToRedis();

    if (redisConnected) {
      const cached = await cache.get<AdminOverviewResponse>(OVERVIEW_CACHE_KEY);
      if (cached) {
        return cached;
      }
    }

    const now = new Date();
    const last24Hours = new Date(now);
    last24Hours.setHours(now.getHours() - 24);

    const chartStart = buildChartWindow();

    const [
      totalBusinesses,
      activeUsers,
      menusPublished,
      apiCallsCount,
      recentAuditLogs,
      chartRows,
      storageRows,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.user.count({
        where: {
          role: {
            not: UserRole.SUPER_ADMIN,
          },
        },
      }),
      prisma.menu.count({
        where: {
          status: 'PUBLISHED',
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: last24Hours,
          },
        },
      }),
      prisma.auditLog.findMany({
        take: OVERVIEW_RECENT_ACTIVITY_LIMIT,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          actorId: true,
          actorType: true,
          metadata: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.$queryRaw<Array<{ date: string; calls: bigint | number }>>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
               COUNT(*)::bigint AS calls
        FROM "audit_logs"
        WHERE "createdAt" >= ${chartStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<Array<{ bytes: bigint | number }>>`
        SELECT pg_database_size(current_database())::bigint AS bytes
      `,
    ]);

    const storageUsedBytes = Number(storageRows[0]?.bytes ?? 0);
    const response: AdminOverviewResponse = {
      totalBusinesses,
      activeUsers,
      storageUsedBytes,
      storageUsed: formatBytes(storageUsedBytes),
      menusPublished,
      apiCallsCount,
      apiCallsData: buildChartSeries(chartRows),
      recentActivity: recentAuditLogs.map(mapRecentActivity),
      lastUpdated: now.toISOString(),
    };

    if (redisConnected) {
      await cache.set(OVERVIEW_CACHE_KEY, response, OVERVIEW_CACHE_TTL_SECONDS);
    }

    return response;
  },
};
