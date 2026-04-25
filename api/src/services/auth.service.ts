import bcrypt from 'bcryptjs';
import { Prisma, User, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { AuthenticatedUser } from '../types/user';
import { tokenService } from './token.service';
import { resolvePermissions } from '../config/rbac';
import { HttpError } from '../utils/http-error';

// Define the return type for auth functions
type AuthResult = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: {
    token: string;
    expiresAt: Date;
  };
  user: AuthenticatedUser;
};

export const loadAuthenticatedUser = async (id: string): Promise<AuthenticatedUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
      memberships: { select: { businessId: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });

  if (!user) return null;

  const permissions = resolvePermissions(user.role, undefined);
  
  return attachBusinessId({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roles: [user.role],
    ownedBusinesses: user.ownedBusinesses,
    memberships: user.memberships,
  }, permissions);
};

export const attachBusinessId = (user: {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  roles: UserRole[];
  ownedBusinesses?: Array<{ id: string }>;
  memberships?: Array<{ businessId: string }>;
}, permissions?: string[]): AuthenticatedUser => {
  const businessId = user.ownedBusinesses?.[0]?.id ?? user.memberships?.[0]?.businessId ?? null;

  return {
    ...user,
    businessId: businessId || undefined,
    permissions: permissions || [],
  };
};

export const sanitizeUser = (user: User): Omit<AuthenticatedUser, 'businessId' | 'permissions'> => {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roles: [user.role],
  };
};

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw new HttpError(409, 'Email is already taken');

  const hashedPassword = await bcrypt.hash(input.password, 10);

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: hashedPassword,
        role: UserRole.STAFF,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'Email is already taken');
    }
    throw error;
  }

  return issueTokensForUser(user.id, user.role);
};

export const issueTokensForUser = async (id: string, _role: UserRole): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      passwordHash: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
      memberships: { select: { businessId: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });

  if (!user) throw new Error('User not found');

  const permissions = resolvePermissions(user.role, undefined);
  
  const userWithBusinessId = attachBusinessId({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roles: [user.role],
    ownedBusinesses: user.ownedBusinesses,
    memberships: user.memberships,
  }, permissions);
  

  const tokens = await tokenService.issueTokensForUser({
    userId: id,
    roles: [user.role],
    businessId: userWithBusinessId.businessId || null,
    permissions,
  });

  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: {
      token: tokens.refreshToken,
      expiresAt: tokens.refreshTokenExpiresAt,
    },
    user: userWithBusinessId,
  };
};

export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash); // Changed from password to passwordHash

  if (!isValidPassword) throw new HttpError(401, 'Invalid email or password');

  return issueTokensForUser(user.id, user.role);
};

export const logout = async (refreshToken: string) => {
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
};
