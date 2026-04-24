import { Prisma, UserRole } from '@prisma/client';

import {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from '../schemas/user.schema';
import { AuthenticatedUser, SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/cache';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const USER_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type UserListItem = SanitizedUser;

type UserDetail = UserListItem;

const sanitizeUser = <
  T extends {
    passwordHash?: string;
    role: UserRole;
    ownedBusinesses?: Array<{ id: string }>;
    memberships?: Array<{ businessId: string }>;
  }
>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, role, ...rest } = user;

  return {
    ...(rest as unknown as SanitizedUser),
    role,
    roles: (rest as Record<string, any>).roles ?? [role],
    businessId:
      (rest as Record<string, any>).businessId ??
      user.ownedBusinesses?.[0]?.id ??
      user.memberships?.[0]?.businessId ??
      null,
  };
};

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const normalizeQuery = (
  query: ListUsersQuery | undefined
): {
  where: Prisma.UserWhereInput;
  orderBy: Prisma.UserOrderByWithRelationInput;
  page?: number;
  limit?: number;
} => {
  const where: Prisma.UserWhereInput = {};
  const sortBy = query?.sortBy ?? 'createdAt';
  const sortDirection = query?.sortDirection ?? 'desc';

  if (query?.role) {
    where.role = query.role;
  }

  if (query?.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { fullName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return {
    where,
    orderBy: {
      [sortBy]: sortDirection,
    },
    page: query?.page,
    limit: query?.limit,
  };
};

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  ownedBusinesses: {
    select: {
      id: true,
    },
    take: 1,
  },
  memberships: {
    select: {
      businessId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
  },
} as const;

const cacheKeyForUser = (userId: string) => `user:${userId}`;
const getBusinessScope = (actor: AuthenticatedUser) => actor.businessId ?? null;

export const userService = {
  list: async (
    actor: AuthenticatedUser,
    query?: ListUsersQuery
  ): Promise<PaginatedResponse<UserListItem>> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to list users');
    }

    try {
      const { where, orderBy, page, limit } = normalizeQuery(query);
      const businessId = getBusinessScope(actor);
      const effectiveWhere: Prisma.UserWhereInput =
        actor.role === UserRole.SUPER_ADMIN
          ? where
          : {
              AND: [
                where,
                {
                  OR: [
                    { id: actor.id },
                    {
                      memberships: {
                        some: {
                          businessId: businessId ?? '',
                        },
                      },
                    },
                  ],
                },
              ],
            };
      const { page: currentPage, limit: currentLimit } = normalizePagination(
        page ?? DEFAULT_PAGE,
        limit ?? DEFAULT_LIMIT
      );

      const skip = (currentPage - 1) * currentLimit;

      const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
          where: effectiveWhere,
          select: USER_SELECT,
          skip,
          take: currentLimit,
          orderBy,
        }),
        prisma.user.count({ where: effectiveWhere }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit);

      const sanitizedUsers = users.map((user) => sanitizeUser(user));

      return {
        data: sanitizedUsers,
        meta: {
          page: currentPage,
          limit: currentLimit,
          totalItems,
          totalPages,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to list users');
      throw error;
    }
  },

  getById: async (userId: string, actor: AuthenticatedUser): Promise<UserDetail> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to view this user');
    }

    const cacheKey = cacheKeyForUser(userId);

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<SanitizedUser>(cacheKey);
      if (cached) {
        return { ...cached, roles: cached.roles ?? [cached.role] };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (actor.role === UserRole.OWNER && actor.businessId && actor.id !== userId) {
      const assignment = await prisma.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId: actor.businessId,
            userId,
          },
        },
      });

      if (!assignment) {
        throw new HttpError(403, 'You do not have permission to view this user');
      }
    }

    const sanitized = sanitizeUser(user);

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  create: async (
    input: CreateUserInput,
    actor: AuthenticatedUser
  ): Promise<SanitizedUser> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to create users');
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, 'A user with this email already exists');
    }

    const roleToAssign = actor.role === UserRole.OWNER ? UserRole.STAFF : input.role ?? UserRole.STAFF;

    if (actor.role === UserRole.OWNER && roleToAssign !== UserRole.STAFF) {
      throw new HttpError(400, 'Owners can only create staff accounts');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        role: roleToAssign,
      },
      select: USER_SELECT,
    });

    const sanitized = sanitizeUser(user);

    if (actor.role === UserRole.OWNER && actor.businessId) {
      await prisma.businessUser.upsert({
        where: {
          businessId_userId: {
            businessId: actor.businessId,
            userId: sanitized.id,
          },
        },
        update: {},
        create: {
          businessId: actor.businessId,
          userId: sanitized.id,
          role: UserRole.STAFF,
        },
      });
    }

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKeyForUser(sanitized.id), sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  update: async (
    userId: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser
  ): Promise<UserDetail> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to update this user');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (actor.role === UserRole.OWNER && actor.businessId && actor.id !== userId) {
      const assignment = await prisma.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId: actor.businessId,
            userId,
          },
        },
      });

      if (!assignment) {
        throw new HttpError(403, 'You do not have permission to update this user');
      }
    }

    if (input.email && input.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
      if (duplicate) {
        throw new HttpError(409, 'A user with this email already exists');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email ?? existing.email,
        fullName: input.fullName === undefined ? existing.fullName : input.fullName,
      },
      select: USER_SELECT,
    });

    const sanitized = sanitizeUser(updated);

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKeyForUser(userId), sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  updateRole: async (
    userId: string,
    input: UpdateUserRoleInput,
    actor: AuthenticatedUser
  ): Promise<UserDetail> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to update user roles');
    }

    if (actor.id === userId) {
      throw new HttpError(400, 'You cannot change your own role');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (actor.role === UserRole.OWNER) {
      if (!actor.businessId) {
        throw new HttpError(403, 'You do not have permission to update this user');
      }

      const assignment = await prisma.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId: actor.businessId,
            userId,
          },
        },
      });

      if (!assignment) {
        throw new HttpError(403, 'You do not have permission to update this user');
      }

      if (input.role !== UserRole.STAFF) {
        throw new HttpError(400, 'Owners can only assign the STAFF role');
      }
    }

    if (existing.role === input.role) {
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: USER_SELECT,
      });

      const sanitizedCurrent = sanitizeUser(current);

      if (cache.isConnectedToRedis()) {
        await cache.set(cacheKeyForUser(userId), sanitizedCurrent, USER_CACHE_TTL_SECONDS);
      }

      return sanitizedCurrent;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: input.role,
      },
      select: USER_SELECT,
    });

    const sanitized = sanitizeUser(updated);

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKeyForUser(userId), sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  remove: async (userId: string, actor: AuthenticatedUser): Promise<void> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to delete users');
    }

    if (actor.id === userId) {
      throw new HttpError(400, 'You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (actor.role === UserRole.OWNER) {
      if (!actor.businessId) {
        throw new HttpError(403, 'You do not have permission to delete this user');
      }

      const assignment = await prisma.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId: actor.businessId,
            userId,
          },
        },
      });

      if (!assignment) {
        throw new HttpError(403, 'You do not have permission to delete this user');
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    if (cache.isConnectedToRedis()) {
      await cache.del(cacheKeyForUser(userId));
    }
  },
};
