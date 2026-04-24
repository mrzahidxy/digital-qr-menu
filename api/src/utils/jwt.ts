import {
  JsonWebTokenError,
  NotBeforeError,
  SignOptions,
  Secret,
  TokenExpiredError,
  sign,
  verify,
  VerifyOptions,
} from 'jsonwebtoken';

import { UserRole } from '@prisma/client';

import { env } from './env';
import { HttpError } from './http-error';

export interface AccessTokenPayload {
  userId: string;
  businessId?: string | null;
  roles: UserRole[];
  permissions: string[];
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

const accessTokenSecret: Secret = env.JWT_SECRET;
const accessTokenTtlMinutes = env.ACCESS_TOKEN_TTL_MINUTES;

const issuerOptions = {
  issuer: env.JWT_ISSUER,
  ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
} satisfies VerifyOptions;

export const createAccessToken = (payload: AccessTokenPayload, options?: SignOptions) => {
  const expiresIn = options?.expiresIn ?? `${accessTokenTtlMinutes}m`;
  const signOptions: SignOptions = {
    ...issuerOptions,
    ...(options ?? {}),
    expiresIn,
  };

  const token = sign(payload, accessTokenSecret, signOptions);
  const expiresAt = new Date(Date.now() + accessTokenTtlMinutes * 60 * 1000);

  return { token, expiresAt };
};

export const verifyAccessToken = (token: string): DecodedAccessToken => {
  try {
    const decoded = verify(token, accessTokenSecret, issuerOptions) as DecodedAccessToken;
    if (typeof decoded !== 'object' || decoded === null) {
      throw new HttpError(401, 'Invalid token');
    }

    const { userId, businessId, roles, permissions, iat, exp } = decoded;

    if (typeof userId !== 'string' || !Array.isArray(roles) || roles.length === 0) {
      throw new HttpError(401, 'Invalid token payload');
    }

    return {
      userId,
      businessId: typeof businessId === 'string' ? businessId : null,
      roles,
      permissions,
      iat,
      exp
    };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(401, 'Access token expired', {
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt?.toISOString?.() ?? null,
      });
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      throw new HttpError(401, 'Invalid access token', {
        code: 'TOKEN_INVALID',
      });
    }

    throw new HttpError(401, 'Authentication failed', error);
  }
};
