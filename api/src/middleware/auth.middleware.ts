import { UserRole } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import type { AuthenticatedRequest } from '../types/http';
import { cache } from '../utils/cache';
import type { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { resolvePermissions } from '../config/rbac';
import { extendRequestContext } from '../utils/logger';

type GuardOptions = {
  roles?: UserRole[];
  permissions?: string[];
};

const normalizeUser = (user: SanitizedUser): SanitizedUser => ({
  ...user,
  roles: [user.role],
  businessId: user.businessId ?? undefined,
});

const normalizeOptions = (allowed?: GuardOptions): { roles?: UserRole[]; permissions?: string[] } => {
  if (!allowed) return {};
  if (Array.isArray(allowed)) {
    return { roles: allowed };
  }
  return allowed;
};

export const requireAuth =
  (allowed?: GuardOptions) => async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'Authentication token missing', {
          code: 'TOKEN_MISSING',
        });
      }

      const token = header.replace('Bearer ', '').trim();
      const payload = verifyAccessToken(token);
      const guard = normalizeOptions(allowed);

      const cacheKey = `user:${payload.userId}`;
      let user: SanitizedUser | null = null;

      if (cache.isConnectedToRedis()) {
        const cached = await cache.get<SanitizedUser>(cacheKey);
        if (cached) {
          user = normalizeUser(cached);
        }
      }

      if (!user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            ownedBusinesses: {
              select: { id: true },
              take: 1,
            },
            memberships: {
              select: { businessId: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        });

        if (!dbUser) {
          throw new HttpError(401, 'User could not be found');
        }

        user = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          roles: [dbUser.role],
          businessId: dbUser.ownedBusinesses[0]?.id ?? dbUser.memberships[0]?.businessId ?? null,
          permissions: [],
        };

        if (cache.isConnectedToRedis()) {
          await cache.set(cacheKey, user, 60 * 60);
        }
      }

      if (!user) {
        throw new HttpError(401, 'User could not be found');
      }

      const userWithRoles = normalizeUser({
        ...user,
        businessId: payload.businessId ?? user.businessId ?? null,
      });

      const hasRole =
        !guard.roles ||
        guard.roles.some((role) => payload.roles.includes(role));

      const hasPermission =
        !guard.permissions ||
        guard.permissions.some(
          (permission) =>
            (payload.permissions ?? []).includes(permission) ||
            resolvePermissions(userWithRoles.role, undefined).includes(permission as any)
        );

      if (!hasRole || !hasPermission) {
        throw new HttpError(403, 'You do not have permission to access this resource');
      }

      req.user = userWithRoles;
      req.auth = payload;
      extendRequestContext({ userId: userWithRoles.id });
      next();
    } catch (error) {
      next(error);
    }
  };
