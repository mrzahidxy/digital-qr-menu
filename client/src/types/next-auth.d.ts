import type { DefaultSession } from 'next-auth'
import type { UserRole } from './user'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string
      role?: UserRole
      businessId?: string | null
      permissions?: string[]
      token?: string
    }
    accessToken?: string
    accessTokenExpiresAt?: number
    accessTokenExpired?: boolean
  }

  interface User {
    role?: UserRole
    businessId?: string | null
    token?: string
    accessTokenExpiresAt?: number | null
    permissions?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: UserRole
    businessId?: string | null
    accessToken?: string
    accessTokenExpiresAt?: number | null
    accessTokenExpired?: boolean
    permissions?: string[]
  }
}
