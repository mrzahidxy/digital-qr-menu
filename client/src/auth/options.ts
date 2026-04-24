import { randomBytes } from 'node:crypto'
import { env } from '@/config/env'
import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { loginSchema } from '@/validation/auth-schema'
import type { UserRole } from '@/types/user'

import type { User } from 'next-auth'

const ALLOWED_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'OWNER',
  'STAFF',
  'USER',
  'GUEST',
]

function decodeJwtExp(accessToken?: string | null): number | null {
  if (!accessToken) return null

  try {
    const [, payload] = accessToken.split('.')
    if (!payload) return null
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload =
      typeof atob === 'function'
        ? atob(normalizedPayload)
        : Buffer.from(normalizedPayload, 'base64').toString('utf8')
    const decoded = JSON.parse(decodedPayload) as {
      exp?: number
    }
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function resolveUserRole(role?: string | null): UserRole {
  if (!role) {
    return 'GUEST'
  }

  const normalized = role.toUpperCase().replace(/\s+/g, '_')

  if (ALLOWED_ROLES.includes(normalized as UserRole)) {
    return normalized as UserRole
  }

  if (normalized === 'STAFF') {
    return 'STAFF'
  }


  return 'GUEST'
}

const credentialProvider = Credentials({
  name: 'Email and Password',
  async authorize(rawCredentials, _request): Promise<User | null> {
    const parsed = loginSchema.safeParse({
      email: rawCredentials.email,
      password: rawCredentials.password,
    })

    if (!parsed.success) {
      return null
    }

    if (!env.NEXT_PUBLIC_API_BASE_URL) {
      return null
    }

    const loginUrl = new URL('/api/v1/auth/login', env.NEXT_PUBLIC_API_BASE_URL)

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed.data),
    })

    if (!response.ok) {
      return null
    }

    const result: {
      accessToken?: string
      token?: string
      accessTokenExpiresAt?: string
      user?: {
        id?: string | number
        email?: string
        fullName?: string
        role?: string
        businessId?: string | null
        roles?: string[]
        permissions?: string[]
      }
    } | null = await response.json().catch(() => null)

    const accessToken = result?.accessToken ?? result?.token
    const parsedAccessTokenExpiry = result?.accessTokenExpiresAt
      ? new Date(result.accessTokenExpiresAt).getTime()
      : null
    const accessTokenExpiresAt = Number.isFinite(parsedAccessTokenExpiry)
      ? parsedAccessTokenExpiry
      : decodeJwtExp(accessToken)

    if (!accessToken || !result?.user || result.user.id === undefined) {
      return null
    }

    const userRole = resolveUserRole(result.user.role ?? result.user.roles?.[0])
    const permissions = Array.isArray(result.user.permissions) ? result.user.permissions : []

    const email = result.user.email ?? parsed.data.email
    const resolvedName =
      typeof result.user.fullName === 'string' && result.user.fullName.trim().length > 0
        ? result.user.fullName
        : email.split('@')[0] ?? 'User'

    const user: User = {
      id: String(result.user.id),
      email,
      name: resolvedName,
      role: userRole,
      businessId: result.user.businessId ?? null,
      token: accessToken,
      accessTokenExpiresAt,
      permissions,
    }

    return user
  },
})

const oauthProviders = []

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  )
}

const secret =
  env.NEXTAUTH_SECRET ??
  (env.NODE_ENV === 'production'
    ? (() => {
      throw new Error('NEXTAUTH_SECRET environment variable is required')
    })()
    : randomBytes(32).toString('hex'))

const authConfig: NextAuthConfig = {
  secret,
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  providers: [credentialProvider, ...oauthProviders],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {

      if (user) {
        token.id = String(user.id)
        token.name = user.name
        if ('role' in user && user.role) {
          token.role = user.role as UserRole
        }
        if ('businessId' in user) {
          token.businessId = (user as { businessId?: string | null }).businessId ?? null
        }
        if ('token' in user && user.token) {
          token.accessToken = user.token
        }
        if ('accessTokenExpiresAt' in user) {
          const expiresAt = (user as { accessTokenExpiresAt?: number | null }).accessTokenExpiresAt
          token.accessTokenExpiresAt = typeof expiresAt === 'number' ? expiresAt : null
        }
        if ('permissions' in user && Array.isArray(user.permissions)) {
          token.permissions = user.permissions
        }
      }

      if (!token.accessTokenExpiresAt && token.accessToken) {
        token.accessTokenExpiresAt = decodeJwtExp(token.accessToken as string)
      }

      token.accessTokenExpired =
        typeof token.accessTokenExpiresAt === 'number' && Date.now() >= token.accessTokenExpiresAt

      return token
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.role) {
        session.user.role = token.role as UserRole
      }
      if (token.businessId !== undefined) {
        session.user.businessId = token.businessId as string | null
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
        session.user.token = token.accessToken as string
      }
      if (typeof token.accessTokenExpiresAt === 'number') {
        session.accessTokenExpiresAt = token.accessTokenExpiresAt
      }
      session.accessTokenExpired = token.accessTokenExpired === true
      if (token.permissions) {
        session.user.permissions = token.permissions as string[]
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
