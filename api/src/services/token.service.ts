import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { cache } from '../utils/cache';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';
import { createAccessToken, AccessTokenPayload } from '../utils/jwt';

const REFRESH_TOKEN_PREFIX = 'refresh-token:';
const REFRESH_TOKEN_BYTE_LENGTH = 48;
const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

type RefreshTokenRecord = {
  tokenHash: string;
  userId: string;
  businessId: string | null;
  roles: UserRole[];
  permissions: string[];
  expiresAt: Date;
};

export type RefreshTokenContext = {
  userId: string;
  businessId?: string | null;
  roles: UserRole[];
  permissions: string[];
};

export type RefreshTokenSession = {
  userId: string;
  businessId: string | null;
  roles: UserRole[];
  permissions: string[];
};

export type TokenPair = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

const inMemoryStore = new Map<string, RefreshTokenRecord>();

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const keyForToken = (tokenHash: string) => `${REFRESH_TOKEN_PREFIX}${tokenHash}`;

const ttlSecondsFrom = (expiresAt: Date) => Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

const persistRecord = async (record: RefreshTokenRecord) => {
  const key = keyForToken(record.tokenHash);
  const ttlSeconds = ttlSecondsFrom(record.expiresAt);

  if (cache.isConnectedToRedis()) {
    await cache.set(key, record, ttlSeconds);
  } else {
    inMemoryStore.set(key, record);
  }
};

const getRecord = async (tokenHash: string): Promise<RefreshTokenRecord | null> => {
  const key = keyForToken(tokenHash);

  if (cache.isConnectedToRedis()) {
    const cached = await cache.get<RefreshTokenRecord>(key);
    if (cached) {
      return {
        ...cached,
        expiresAt: new Date(cached.expiresAt),
        permissions: cached.permissions ?? [],
      };
    }
  }

  const inMemory = inMemoryStore.get(key);
  return inMemory ?? null;
};

const deleteRecord = async (tokenHash: string) => {
  const key = keyForToken(tokenHash);
  if (cache.isConnectedToRedis()) {
    await cache.del(key);
  }
  inMemoryStore.delete(key);
};

const ensureActive = async (record: RefreshTokenRecord, tokenHash: string) => {
  if (record.expiresAt.getTime() <= Date.now()) {
    await deleteRecord(tokenHash);
    throw new HttpError(401, 'Refresh token has expired');
  }
};

const createRefreshToken = async (context: RefreshTokenContext) => {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('hex');
  const tokenHash = hashToken(token);
  const issuedAt = Date.now();

  const record: RefreshTokenRecord = {
    tokenHash,
    userId: context.userId,
    businessId: context.businessId ?? null,
    roles: context.roles,
    permissions: context.permissions ?? [],
    expiresAt: new Date(issuedAt + REFRESH_TOKEN_TTL_MS),
  };

  await persistRecord(record);

  return {
    token,
    expiresAt: record.expiresAt,
    session: {
      userId: record.userId,
      businessId: record.businessId,
      roles: record.roles,
      permissions: record.permissions,
    },
  };
};

const buildAccessToken = (session: RefreshTokenSession) => {
  const payload: AccessTokenPayload = {
    userId: session.userId,
    businessId: session.businessId,
    roles: session.roles,
    permissions: session.permissions,
  };

  return createAccessToken(payload);
};

const validateRefreshToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await getRecord(tokenHash);

  if (!record) {
    throw new HttpError(401, 'Refresh token is invalid');
  }

  await ensureActive(record, tokenHash);

  return { record, tokenHash };
};

const issueTokensForUser = async (context: RefreshTokenContext): Promise<TokenPair> => {
  const normalizedContext: RefreshTokenSession = {
    userId: context.userId,
    businessId: context.businessId ?? null,
    roles: context.roles,
    permissions: context.permissions,
  };

  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await createRefreshToken(
    normalizedContext
  );

  const { token: accessToken, expiresAt: accessTokenExpiresAt } = buildAccessToken(normalizedContext);

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
  };
};

const refreshWithToken = async (
  token: string
): Promise<{ tokens: TokenPair; session: RefreshTokenSession }> => {
  const { record, tokenHash } = await validateRefreshToken(token);
  await deleteRecord(tokenHash);

  const session: RefreshTokenSession = {
    userId: record.userId,
    businessId: record.businessId,
    roles: record.roles,
    permissions: record.permissions ?? [],
  };

  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await createRefreshToken(session);
  const { token: accessToken, expiresAt: accessTokenExpiresAt } = buildAccessToken(session);

  return {
    tokens: {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
    },
    session,
  };
};

const revokeRefreshToken = async (token: string) => {
  const tokenHash = hashToken(token);
  await deleteRecord(tokenHash);
};

export const tokenService = {
  issueTokensForUser,
  refreshWithToken,
  revokeRefreshToken,
};
