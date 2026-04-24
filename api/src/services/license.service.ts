import crypto from 'crypto';

import { Prisma, UserRole } from '@prisma/client';

import {
  type CreateLicenseInput,
  type LicensePlan,
  type LicenseStatus,
  type ListLicensesQuery,
  type UpdateLicenseInput,
} from '../schemas/license.schema';
import type { AuthenticatedUser } from '../types/user';
import { cache } from '../utils/cache';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const LIST_CACHE_TTL_SECONDS = 30;
const DETAIL_CACHE_TTL_SECONDS = 30;
const EXPIRING_SOON_DAYS = 30;

const LICENSE_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;

type LicenseStatusValue = LicenseStatus | 'EXPIRED';

type RawLicenseRecord = {
  id: string;
  key: string;
  plan: LicensePlan;
  status: LicenseStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  business_id: string | null;
  business_name: string | null;
  business_owner_id: string | null;
  business_owner_email: string | null;
  business_owner_fullName: string | null;
};

type LicenseSummary = {
  id: string;
  key: string;
  plan: LicensePlan;
  status: LicenseStatusValue;
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  business: {
    id: string;
    name: string;
    owner: {
      id: string;
      email: string;
      fullName: string | null;
    };
  } | null;
};

type LicenseDetail = LicenseSummary & {
  validityDays: number;
  daysRemaining: number;
};

export type LicenseListResponse = {
  data: LicenseSummary[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  stats: {
    active: number;
    expired: number;
    suspended: number;
    expiringSoon: number;
  };
};

export type LicenseDetailResponse = LicenseDetail;

export type LicenseStatsResponse = LicenseListResponse['stats'];

const normalizePagination = (page?: number, limit?: number) => ({
  page: Number.isFinite(page ?? NaN) && (page ?? 0) > 0 ? Math.floor(page as number) : DEFAULT_PAGE,
  limit: Math.min(
    Number.isFinite(limit ?? NaN) && (limit ?? 0) > 0 ? Math.floor(limit as number) : DEFAULT_LIMIT,
    MAX_LIMIT
  ),
});

const normalizeSearch = (search?: string) => search?.trim() || undefined;

const listCacheKey = (query: ListLicensesQuery) =>
  [
    'licenses:list',
    query.page ?? DEFAULT_PAGE,
    query.limit ?? DEFAULT_LIMIT,
    query.search ?? '',
    query.plan ?? '',
    query.status ?? '',
    query.businessId ?? '',
    query.issuedFrom?.toISOString() ?? '',
    query.issuedTo?.toISOString() ?? '',
    query.expiresFrom?.toISOString() ?? '',
    query.expiresTo?.toISOString() ?? '',
    query.sortBy ?? '',
    query.sortDirection ?? '',
  ].join(':');

const detailCacheKey = (licenseId: string) => `licenses:detail:${licenseId}`;

const LICENSE_SELECT_SQL = Prisma.sql`
  SELECT
    l."id",
    l."key",
    l."plan",
    l."status",
    l."issuedAt",
    l."expiresAt",
    l."createdAt",
    l."updatedAt",
    r."id" AS "business_id",
    r."name" AS "business_name",
    ru."id" AS "business_owner_id",
    ru."email" AS "business_owner_email",
    ru."fullName" AS "business_owner_fullName"
  FROM "license_keys" l
  LEFT JOIN "businesses" r ON r."id" = l."businessId"
  LEFT JOIN "users" ru ON ru."id" = r."ownerId"
`;

const LICENSE_FROM_SQL = Prisma.sql`
  FROM "license_keys" l
  LEFT JOIN "businesses" r ON r."id" = l."businessId"
  LEFT JOIN "users" ru ON ru."id" = r."ownerId"
`;

const buildBaseFilters = (query: ListLicensesQuery) => {
  const clauses: Prisma.Sql[] = [];

  const normalizedSearch = normalizeSearch(query.search);
  if (normalizedSearch) {
    const search = `%${normalizedSearch}%`;
    clauses.push(Prisma.sql`
      (
        l."key" ILIKE ${search}
        OR COALESCE(r."name", '') ILIKE ${search}
        OR COALESCE(ru."email", '') ILIKE ${search}
        OR COALESCE(ru."fullName", '') ILIKE ${search}
      )
    `);
  }

  if (query.plan) {
    clauses.push(Prisma.sql`l."plan" = CAST(${query.plan} AS "LicensePlan")`);
  }

  if (query.status) {
    clauses.push(Prisma.sql`l."status" = CAST(${query.status} AS "LicenseStatus")`);
  }

  if (query.businessId) {
    clauses.push(Prisma.sql`l."businessId" = ${query.businessId}`);
  }

  if (query.issuedFrom) {
    clauses.push(Prisma.sql`l."issuedAt" >= ${query.issuedFrom}`);
  }

  if (query.issuedTo) {
    clauses.push(Prisma.sql`l."issuedAt" <= ${query.issuedTo}`);
  }

  if (query.expiresFrom) {
    clauses.push(Prisma.sql`l."expiresAt" >= ${query.expiresFrom}`);
  }

  if (query.expiresTo) {
    clauses.push(Prisma.sql`l."expiresAt" <= ${query.expiresTo}`);
  }

  return clauses;
};

const buildWhereClause = (clauses: Prisma.Sql[]) =>
  clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.sql``;

const buildOrderClause = (query: ListLicensesQuery) => {
  const sortBy = query.sortBy ?? 'createdAt';
  const sortDirection = query.sortDirection ?? 'desc';
  const direction = sortDirection === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

  switch (sortBy) {
    case 'key':
      return Prisma.sql`ORDER BY l."key" ${direction}`;
    case 'plan':
      return Prisma.sql`ORDER BY l."plan" ${direction}, l."createdAt" DESC`;
    case 'status':
      return Prisma.sql`ORDER BY l."status" ${direction}, l."createdAt" DESC`;
    case 'issuedAt':
      return Prisma.sql`ORDER BY l."issuedAt" ${direction}, l."createdAt" DESC`;
    case 'expiresAt':
      return Prisma.sql`ORDER BY l."expiresAt" ${direction}, l."createdAt" DESC`;
    case 'updatedAt':
      return Prisma.sql`ORDER BY l."updatedAt" ${direction}, l."createdAt" DESC`;
    case 'createdAt':
    default:
      return Prisma.sql`ORDER BY l."createdAt" ${direction}`;
  }
};

const rawToSummary = (record: RawLicenseRecord): LicenseSummary => {
  const status = effectiveStatus({ status: record.status, expiresAt: record.expiresAt });
  const expiresInMs = record.expiresAt ? record.expiresAt.getTime() - Date.now() : null;

  return {
    id: record.id,
    key: record.key,
    plan: record.plan,
    status,
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    isExpired: status === LICENSE_STATUS.EXPIRED,
    isExpiringSoon:
      status === LICENSE_STATUS.ACTIVE &&
      expiresInMs !== null &&
      expiresInMs > 0 &&
      expiresInMs <= EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000,
    business: record.business_id
      ? {
          id: record.business_id,
          name: record.business_name ?? '',
          owner: {
            id: record.business_owner_id ?? '',
            email: record.business_owner_email ?? '',
            fullName: record.business_owner_fullName,
          },
        }
      : null,
  };
};

const rawToDetail = (record: RawLicenseRecord): LicenseDetail => {
  const summary = rawToSummary(record);
  const validityDays = record.expiresAt
    ? Math.max(0, Math.ceil((record.expiresAt.getTime() - record.issuedAt.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  return {
    ...summary,
    validityDays,
    daysRemaining: record.expiresAt
      ? Math.ceil((record.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0,
  };
};

const fetchLicenseRowById = async (id: string): Promise<RawLicenseRecord | null> => {
  const rows = await prisma.$queryRaw<RawLicenseRecord[]>(Prisma.sql`
    ${LICENSE_SELECT_SQL}
    WHERE l."id" = ${id}
    LIMIT 1
  `);

  return rows[0] ?? null;
};

const invalidateLicenseCaches = async () => {
  if (!cache.isConnectedToRedis()) {
    return;
  }

  await Promise.all([
    cache.delByPrefix('licenses:list:'),
    cache.delByPrefix('licenses:detail:'),
  ]);
};

const requireAdmin = (actor: AuthenticatedUser) => {
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, 'You do not have permission to manage licenses');
  }
};

const requireReadAccess = (actor: AuthenticatedUser) => {
  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
    throw new HttpError(403, 'You do not have permission to view licenses');
  }
};

const effectiveStatus = (license: {
  status: LicenseStatus;
  expiresAt: Date | null;
}): LicenseStatusValue => {
  if (license.status === LICENSE_STATUS.SUSPENDED) {
    return LICENSE_STATUS.SUSPENDED;
  }

  if (license.expiresAt && license.expiresAt.getTime() < Date.now()) {
    return LICENSE_STATUS.EXPIRED;
  }

  return license.status;
};

const uniqueKey = async (providedKey?: string) => {
  if (providedKey) {
    return providedKey;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generated = `LIC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const existing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT l."id"
      FROM "license_keys" l
      WHERE l."key" = ${generated}
      LIMIT 1
    `);

    if (existing.length === 0) {
      return generated;
    }
  }

  throw new HttpError(500, 'Failed to generate a unique license key');
};

const validateRelations = async (businessId?: string | null) => {
  if (businessId) {
    const business = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT r."id"
      FROM "businesses" r
      WHERE r."id" = ${businessId}
      LIMIT 1
    `);
    if (business.length === 0) {
      throw new HttpError(404, 'Business not found');
    }
  }
};

const licenseStats = async (query: ListLicensesQuery): Promise<LicenseStatsResponse> => {
  const filters = buildBaseFilters(query);
  const now = new Date();
  const expiringSoon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
  const activeFilters = [
    ...filters,
    Prisma.sql`l."status" = CAST(${LICENSE_STATUS.ACTIVE} AS "LicenseStatus")`,
    Prisma.sql`(l."expiresAt" IS NULL OR l."expiresAt" >= ${now})`,
  ];
  const expiredFilters = [
    ...filters,
    Prisma.sql`(l."status" = CAST(${LICENSE_STATUS.EXPIRED} AS "LicenseStatus") OR (l."expiresAt" IS NOT NULL AND l."expiresAt" < ${now}))`,
  ];
  const suspendedFilters = [
    ...filters,
    Prisma.sql`l."status" = CAST(${LICENSE_STATUS.SUSPENDED} AS "LicenseStatus")`,
  ];
  const soonFilters = [
    ...filters,
    Prisma.sql`l."status" = CAST(${LICENSE_STATUS.ACTIVE} AS "LicenseStatus")`,
    Prisma.sql`l."expiresAt" IS NOT NULL`,
    Prisma.sql`l."expiresAt" > ${now}`,
    Prisma.sql`l."expiresAt" <= ${expiringSoon}`,
  ];

  const [active, expired, suspended, soon] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${LICENSE_FROM_SQL}
      ${buildWhereClause(activeFilters)}
    `),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${LICENSE_FROM_SQL}
      ${buildWhereClause(expiredFilters)}
    `),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${LICENSE_FROM_SQL}
      ${buildWhereClause(suspendedFilters)}
    `),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${LICENSE_FROM_SQL}
      ${buildWhereClause(soonFilters)}
    `),
  ]);

  return {
    active: Number(active[0]?.count ?? 0),
    expired: Number(expired[0]?.count ?? 0),
    suspended: Number(suspended[0]?.count ?? 0),
    expiringSoon: Number(soon[0]?.count ?? 0),
  };
};

const countLicenses = async (query: ListLicensesQuery) => {
  const filters = buildBaseFilters(query);
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    ${LICENSE_FROM_SQL}
    ${buildWhereClause(filters)}
  `);

  return Number(rows[0]?.count ?? 0);
};

const fetchLicenseList = async (query: ListLicensesQuery, page: number, limit: number) => {
  const filters = buildBaseFilters(query);
  const orderBy = buildOrderClause(query);
  const skip = (page - 1) * limit;

  return prisma.$queryRaw<RawLicenseRecord[]>(Prisma.sql`
    ${LICENSE_SELECT_SQL}
    ${buildWhereClause(filters)}
    ${orderBy}
    OFFSET ${skip}
    LIMIT ${limit}
  `);
};

export const licenseService = {
  list: async (actor: AuthenticatedUser, query: ListLicensesQuery): Promise<LicenseListResponse> => {
    requireReadAccess(actor);

    const scopedQuery =
      actor.role === UserRole.OWNER
        ? {
            ...query,
            businessId: actor.businessId ?? query.businessId,
          }
        : query;

    if (actor.role === UserRole.OWNER && !actor.businessId) {
      throw new HttpError(403, 'You do not have permission to view licenses');
    }

    const { page, limit } = normalizePagination(scopedQuery.page, scopedQuery.limit);
    const cacheKey = listCacheKey({ ...scopedQuery, page, limit });

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<LicenseListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const [licenses, totalItems, stats] = await Promise.all([
        fetchLicenseList(scopedQuery, page, limit),
        countLicenses(scopedQuery),
        licenseStats(scopedQuery),
      ]);

      const response: LicenseListResponse = {
        data: licenses.map(rawToSummary),
        meta: {
          page,
          limit,
          totalItems,
          totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        },
        stats,
      };

      if (cache.isConnectedToRedis()) {
        await cache.set(cacheKey, response, LIST_CACHE_TTL_SECONDS);
      }

      return response;
    } catch (error) {
      logger.error({ err: error }, 'Failed to list licenses');
      throw error;
    }
  },

  getById: async (actor: AuthenticatedUser, id: string): Promise<LicenseDetailResponse> => {
    requireReadAccess(actor);

    const cacheKey = detailCacheKey(id);

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<LicenseDetailResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const license = await fetchLicenseRowById(id);

      if (!license) {
        throw new HttpError(404, 'License not found');
      }

      if (actor.role === UserRole.OWNER && actor.businessId && license.business_id !== actor.businessId) {
        throw new HttpError(403, 'You do not have permission to view this license');
      }

      const detail = rawToDetail(license);

      if (cache.isConnectedToRedis()) {
        await cache.set(cacheKey, detail, DETAIL_CACHE_TTL_SECONDS);
      }

      return detail;
    } catch (error) {
      logger.error({ err: error }, 'Failed to load license details');
      throw error;
    }
  },

  create: async (actor: AuthenticatedUser, input: CreateLicenseInput): Promise<LicenseDetailResponse> => {
    requireAdmin(actor);

    await validateRelations(input.businessId ?? null);
    const key = await uniqueKey(input.key);
    const issuedAt = input.issuedAt ?? new Date();
    const status = input.status ?? LICENSE_STATUS.ACTIVE;

    const rows = await prisma.$queryRaw<RawLicenseRecord[]>(Prisma.sql`
      INSERT INTO "license_keys" (
        "key",
        "plan",
        "status",
        "issuedAt",
        "expiresAt",
        "businessId"
      )
      VALUES (
        ${key},
        CAST(${input.plan} AS "LicensePlan"),
        CAST(${status} AS "LicenseStatus"),
        ${issuedAt},
        ${input.expiresAt},
        ${input.businessId ?? null}
      )
      RETURNING "id"
    `);

    const license = await fetchLicenseRowById(rows[0].id);

    if (!license) {
      throw new HttpError(500, 'Failed to load created license');
    }

    await invalidateLicenseCaches();

    return rawToDetail(license);
  },

  update: async (
    actor: AuthenticatedUser,
    id: string,
    input: UpdateLicenseInput
  ): Promise<LicenseDetailResponse> => {
    requireAdmin(actor);

    const existing = await fetchLicenseRowById(id);

    if (!existing) {
      throw new HttpError(404, 'License not found');
    }

    if (input.businessId !== undefined) {
      await validateRelations(input.businessId ?? null);
    }

    if (input.key) {
      const duplicate = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT l."id"
        FROM "license_keys" l
        WHERE l."key" = ${input.key}
          AND l."id" <> ${id}
        LIMIT 1
      `);

      if (duplicate.length > 0) {
        throw new HttpError(409, 'A license with this key already exists');
      }
    }

    const updates: Prisma.Sql[] = [];

    if (input.key !== undefined) updates.push(Prisma.sql`"key" = ${input.key}`);
    if (input.plan !== undefined) updates.push(Prisma.sql`"plan" = CAST(${input.plan} AS "LicensePlan")`);
    if (input.status !== undefined)
      updates.push(Prisma.sql`"status" = CAST(${input.status} AS "LicenseStatus")`);
    if (input.issuedAt !== undefined) updates.push(Prisma.sql`"issuedAt" = ${input.issuedAt}`);
    if (input.expiresAt !== undefined) updates.push(Prisma.sql`"expiresAt" = ${input.expiresAt}`);
    if (input.businessId !== undefined) updates.push(Prisma.sql`"businessId" = ${input.businessId}`);

    if (updates.length > 0) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "license_keys"
        SET ${Prisma.join(updates, ', ')}
        WHERE "id" = ${id}
      `);
    }

    const license = await fetchLicenseRowById(id);
    if (!license) {
      throw new HttpError(404, 'License not found');
    }

    await invalidateLicenseCaches();

    return rawToDetail(license);
  },

  remove: async (actor: AuthenticatedUser, id: string): Promise<void> => {
    requireAdmin(actor);

    const existing = await fetchLicenseRowById(id);

    if (!existing) {
      throw new HttpError(404, 'License not found');
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "license_keys"
      WHERE "id" = ${id}
    `);

    await invalidateLicenseCaches();
  },
};
