'use client'

import { apiClient } from '@/lib/api'

export type BackendUserRole = 'SUPER_ADMIN' | 'OWNER' | 'STAFF'
export type AdminUserRole = BackendUserRole

export type AdminUser = {
  id: string
  email: string
  name?: string | null
  fullName?: string | null
  role: BackendUserRole
  createdAt: string
  updatedAt: string
}

export type UserListFilters = {
  search?: string
  role?: BackendUserRole
  page?: number
  limit?: number
  sortBy?: 'email' | 'name' | 'role' | 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
}

export type CreateUserInput = {
  email: string
  password: string
  role: BackendUserRole
  fullName: string
}

export type UpdateUserInput = {
  email?: string
  fullName?: string | null
}

export type UpdateUserRoleInput = {
  role: BackendUserRole
}

export type UserListResult = {
  data: AdminUser[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

type ApiResponse<T> = {
  message?: string
} & T

type RawAdminUser = Omit<AdminUser, 'id' | 'name'> & {
  id: string | number
  role: string
  name?: string | null
  fullName?: string | null
}

type RawUserListResponse =
  | RawAdminUser[]
  | { data: RawAdminUser[]; meta: UserListResult['meta'] }
  | { users: RawAdminUser[]; meta?: Partial<UserListResult['meta']> }
  | ApiResponse<{ data: RawAdminUser[]; meta: UserListResult['meta'] }>
  | ApiResponse<{ users: RawAdminUser[]; meta?: Partial<UserListResult['meta']> }>
  | ApiResponse<RawAdminUser[]>

function normalizeRole(role: string): BackendUserRole {
  const normalized = role.trim().toUpperCase()
  if (normalized === 'SUPER_ADMIN' || normalized === 'OWNER' || normalized === 'STAFF') {
    return normalized
  }
  if (normalized === 'ADMIN') {
    return 'SUPER_ADMIN'
  }
  return 'STAFF'
}

function normalizeUser(user: RawAdminUser): AdminUser {
  return {
    ...user,
    id: String(user.id),
    role: normalizeRole(user.role),
    fullName: user.fullName ?? null,
  }
}

function normalizeUserListResponse(payload: RawUserListResponse): UserListResult {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeUser),
      meta: {
        page: 1,
        limit: payload.length,
        totalItems: payload.length,
        totalPages: payload.length > 0 ? 1 : 0,
      },
    }
  }

  const withUsers = payload as {
    data?: RawAdminUser[]
    users?: RawAdminUser[]
    meta?: Partial<UserListResult['meta']>
  }

  const data = withUsers.data ?? withUsers.users ?? []
  const page = withUsers.meta?.page ?? 1
  const limit = withUsers.meta?.limit ?? data.length
  const totalItems = withUsers.meta?.totalItems ?? data.length
  const totalPages = withUsers.meta?.totalPages ?? (totalItems > 0 ? Math.ceil(totalItems / Math.max(limit, 1)) : 0)

  return {
    data: data.map(normalizeUser),
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  }
}

export async function fetchUsers(filters: Partial<UserListFilters> = {}): Promise<UserListResult> {
  const response = await apiClient.get<RawUserListResponse>('/api/v1/users', {
    query: filters,
    cache: 'no-store',
    auth: true,
  })

  return normalizeUserListResponse(response)
}

export async function getUserById(id: string): Promise<AdminUser> {
  const response = await apiClient.get<RawAdminUser>(`/api/v1/users/${id}`, {
    cache: 'no-store',
    auth: true,
  })

  return normalizeUser(response)
}

export async function createUser(input: CreateUserInput) {
  const response = await apiClient.post<ApiResponse<{ user: RawAdminUser }>>('/api/v1/users', input, {
    auth: true,
  })

  return {
    ...response,
    user: response.user ? normalizeUser(response.user) : response.user,
  }
}

export async function updateUserProfile(id: string, input: UpdateUserInput) {
  const response = await apiClient.patch<ApiResponse<{ user: RawAdminUser }>>(`/api/v1/users/${id}`, input, {
    auth: true,
  })

  return {
    ...response,
    user: response.user ? normalizeUser(response.user) : response.user,
  }
}

export async function updateUserRole(id: string, input: UpdateUserRoleInput) {
  const response = await apiClient.put<ApiResponse<{ user: RawAdminUser }>>(`/api/v1/users/${id}/role`, input, {
    auth: true,
  })

  return {
    ...response,
    user: response.user ? normalizeUser(response.user) : response.user,
  }
}

export async function deleteUser(id: string) {
  return apiClient.delete<ApiResponse<Record<string, never>>>(`/api/v1/users/${id}`, {
    auth: true,
  })
}
