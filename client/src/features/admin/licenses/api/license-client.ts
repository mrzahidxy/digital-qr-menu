'use client'

import { apiClient } from '@/lib/api'

export type LicenseType = 'MONTHLY' | 'YEARLY' | 'LIFETIME'
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'

export type LicenseKey = {
  id: string
  key: string
  type: LicenseType
  status: LicenseStatus
  issuedAt: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  isExpired: boolean
  isExpiringSoon: boolean
  user: {
    id: string
    email: string
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
  } | null
  business: {
    id: string
    name: string
    owner: {
      id: string
      email: string
      fullName: string | null
    }
  } | null
}

export type LicenseKeyDetail = LicenseKey & {
  validityDays: number
  daysRemaining: number
}

export type LicenseListFilters = {
  search?: string
  type?: LicenseType
  status?: LicenseStatus
  businessId?: string
  issuedFrom?: string
  issuedTo?: string
  expiresFrom?: string
  expiresTo?: string
  page?: number
  limit?: number
  sortBy?: 'key' | 'type' | 'status' | 'issuedAt' | 'expiresAt' | 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
}

export type LicenseStats = {
  active: number
  expired: number
  suspended: number
  expiringSoon: number
}

export type LicenseListResponse = {
  data: LicenseKey[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
  stats: LicenseStats
}

type RawLicenseListResponse = Omit<LicenseListResponse, 'data'> & {
  data: RawLicenseSummary[]
}

type ApiResponse<T> = {
  message?: string
} & T

type RawLicenseSummary = {
  id: string
  key: string
  plan: LicenseType
  status: LicenseStatus
  issuedAt: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  isExpired: boolean
  isExpiringSoon: boolean
  user?: null
  business: LicenseKey['business']
}

type RawLicenseDetail = RawLicenseSummary & {
  validityDays: number
  daysRemaining: number
}

function normalizeLicense(license: RawLicenseSummary): LicenseKey {
  return {
    ...license,
    type: license.plan,
    user: null,
  }
}

function normalizeLicenseDetail(license: RawLicenseDetail): LicenseKeyDetail {
  return {
    ...normalizeLicense(license),
    validityDays: license.validityDays,
    daysRemaining: license.daysRemaining,
  }
}

export type CreateLicenseInput = {
  key?: string
  type: LicenseType
  status?: LicenseStatus
  issuedAt?: string
  expiresAt: string
  businessId?: string
}

export type UpdateLicenseInput = {
  key?: string
  type?: LicenseType
  status?: LicenseStatus
  issuedAt?: string
  expiresAt?: string
  businessId?: string | null
}

function toLicenseQuery(filters: Partial<LicenseListFilters>) {
  const { type, sortBy, ...query } = filters

  return {
    ...query,
    plan: type,
    sortBy: sortBy === 'type' ? 'plan' : sortBy,
  }
}

export async function fetchLicenses(filters: Partial<LicenseListFilters> = {}): Promise<LicenseListResponse> {
  const response = await apiClient.get<RawLicenseListResponse>('/api/v1/licenses', {
    query: toLicenseQuery(filters),
    cache: 'no-store',
    auth: true,
  })

  return {
    ...response,
    data: response.data.map(normalizeLicense),
  }
}

export const listLicenses = fetchLicenses

export async function getLicenseById(id: string): Promise<LicenseKeyDetail> {
  const response = await apiClient.get<RawLicenseDetail>(`/api/v1/licenses/${id}`, {
    cache: 'no-store',
    auth: true,
  })

  return normalizeLicenseDetail(response)
}

export async function createLicense(input: CreateLicenseInput) {
  const response = await apiClient.post<ApiResponse<{ license: RawLicenseDetail }>>(
    '/api/v1/licenses',
    {
      key: input.key,
      plan: input.type,
      status: input.status,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      businessId: input.businessId,
    },
    { auth: true }
  )

  return {
    ...response,
    license: response.license ? normalizeLicenseDetail(response.license) : response.license,
  }
}

export async function updateLicense(id: string, input: UpdateLicenseInput) {
  const response = await apiClient.put<ApiResponse<{ license: RawLicenseDetail }>>(
    `/api/v1/licenses/${id}`,
    {
      key: input.key,
      plan: input.type,
      status: input.status,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      businessId: input.businessId,
    },
    { auth: true }
  )

  return {
    ...response,
    license: response.license ? normalizeLicenseDetail(response.license) : response.license,
  }
}

export async function deleteLicense(id: string) {
  return apiClient.delete<ApiResponse<Record<string, never>>>(`/api/v1/licenses/${id}`, {
    auth: true,
  })
}

export async function suspendLicense(id: string) {
  return updateLicense(id, { status: 'SUSPENDED' })
}

export async function revokeLicense(id: string) {
  return updateLicense(id, { status: 'CANCELLED' })
}

export async function assignLicenseToBusiness(id: string, businessId: string | null) {
  return updateLicense(id, { businessId })
}
