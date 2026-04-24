'use client'

import { apiClient } from '@/lib/api'

export type BusinessSummary = {
  id: string
  name: string
  slug: string
  ownerId: string
  owner: {
    id: string
    email: string
    fullName: string | null
  }
  createdAt: string
  updatedAt: string
  totalMenus: number
  publishedMenus: number
  totalOrders: number
  status: 'ACTIVE' | 'INACTIVE'
  userCount: number
}

export type BusinessDetail = BusinessSummary & {
  description: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  primaryColor: string
  accentColor: string
  fontFamily: string
  isPublicOrderingEnabled: boolean
  owner: BusinessSummary['owner'] & {
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
  }
  users: Array<{
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
    createdAt: string
    user: {
      id: string
      email: string
      fullName: string | null
      role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
    }
  }>
  recentMenus: Array<{
    id: string
    name: string
    slug: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    isDefault: boolean
    createdAt: string
    updatedAt: string
    categoryCount: number
  }>
}

export type BusinessListFilters = {
  search?: string
  page?: number
  limit?: number
}

export type BusinessListResponse = {
  data: BusinessSummary[]
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

export type CreateBusinessInput = {
  name: string
  ownerId: string
}

export type UpdateBusinessInput = {
  name: string
}

export async function fetchBusinesses(
  filters: Partial<BusinessListFilters> = {}
): Promise<BusinessListResponse> {
  return apiClient.get<BusinessListResponse>('/api/v1/admin/businesses', {
    query: filters,
    cache: 'no-store',
    auth: true,
  })
}

export async function getBusinessById(id: string): Promise<BusinessDetail> {
  return apiClient.get<BusinessDetail>(`/api/v1/admin/businesses/${id}`, {
    cache: 'no-store',
    auth: true,
  })
}

export async function createBusiness(input: CreateBusinessInput) {
  return apiClient.post<ApiResponse<{ business: BusinessSummary }>>(
    '/api/v1/admin/businesses',
    input,
    { auth: true }
  )
}

export async function updateBusiness(id: string, input: UpdateBusinessInput) {
  return apiClient.patch<ApiResponse<{ business: BusinessSummary }>>(
    `/api/v1/admin/businesses/${id}`,
    input,
    { auth: true }
  )
}

export async function deleteBusiness(id: string) {
  return apiClient.delete<ApiResponse<Record<string, never>>>(
    `/api/v1/admin/businesses/${id}`,
    { auth: true }
  )
}
