'use client'

import { apiClient } from '@/lib/api'

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
export type AuditCategory = 'AUTH' | 'BUSINESS' | 'MENU' | 'ORDER' | 'USER' | 'LICENSE' | 'SYSTEM'

export type AuditLog = {
  id: string
  timestamp: string
  level: LogLevel
  category: AuditCategory
  message: string
  meta: Record<string, unknown> | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER'
  } | null
  timestampLabel?: string
}

export type AuditLogDetail = AuditLog & {
  timestampIso?: string
  createdAtIso?: string
}

export type LogListFilters = {
  search?: string
  level?: LogLevel
  category?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: 'timestamp' | 'level' | 'category' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
}

export type LogStats = {
  total: number
  error: number
  warn: number
  info: number
  debug: number
  topCategories: Array<{ category: string; count: number }>
}

export type LogListResponse = {
  data: AuditLog[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
  stats: LogStats
}

type ApiResponse<T> = {
  message?: string
} & T

type RawLogSummary = Omit<AuditLog, 'id' | 'category'> & { id: number | string; category: string }
type RawLogDetail = Omit<AuditLogDetail, 'id' | 'category'> & { id: number | string; category: string }

const CATEGORY_FALLBACK: AuditCategory = 'SYSTEM'
const CATEGORY_MAP: Record<string, AuditCategory> = {
  AUTH: 'AUTH',
  BUSINESS: 'BUSINESS',
  MENU: 'MENU',
  ORDER: 'ORDER',
  USER: 'USER',
  LICENSE: 'LICENSE',
  SYSTEM: 'SYSTEM',
  BOOKING: 'ORDER',
  RESTAURANT: 'BUSINESS',
  PAYMENT: 'SYSTEM',
}

function normalizeCategory(category: string): AuditCategory {
  const normalized = category.trim().toUpperCase()
  return CATEGORY_MAP[normalized] ?? CATEGORY_FALLBACK
}

function normalizeLog(record: RawLogSummary): AuditLog {
  return {
    ...record,
    id: String(record.id),
    category: normalizeCategory(record.category),
  }
}

function normalizeAuditLogDetail(record: RawLogDetail): AuditLogDetail {
  return {
    ...record,
    id: String(record.id),
    category: normalizeCategory(record.category),
  }
}

function normalizeListResponse(
  payload:
    | RawLogSummary[]
    | ApiResponse<{ data: RawLogSummary[]; meta: LogListResponse['meta']; stats: LogStats }>
): LogListResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeLog),
      meta: {
        page: 1,
        limit: payload.length,
        totalItems: payload.length,
        totalPages: payload.length > 0 ? 1 : 0,
      },
      stats: {
        total: payload.length,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        topCategories: [],
      },
    }
  }

  const data = payload.data ?? []
  const meta = payload.meta ?? {}
  const stats = payload.stats ?? {}

  const page = meta.page ?? 1
  const limit = meta.limit ?? data.length
  const totalItems = meta.totalItems ?? data.length
  const totalPages = meta.totalPages ?? (totalItems > 0 ? Math.ceil(totalItems / Math.max(limit, 1)) : 0)

  return {
    data: data.map(normalizeLog),
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
    stats: {
      total: stats.total ?? totalItems,
      error: stats.error ?? 0,
      warn: stats.warn ?? 0,
      info: stats.info ?? 0,
      debug: stats.debug ?? 0,
      topCategories: stats.topCategories ?? [],
    },
  }
}

export async function fetchLogs(filters: Partial<LogListFilters> = {}): Promise<LogListResponse> {
  const response = await apiClient.get<
    RawLogSummary[] | ApiResponse<{ data: RawLogSummary[]; meta: LogListResponse['meta']; stats: LogStats }>
  >('/api/v1/logs', {
    query: filters,
    cache: 'no-store',
    auth: true,
  })

  return normalizeListResponse(response)
}

export const listLogs = fetchLogs

export async function getLogById(id: string): Promise<AuditLogDetail> {
  const response = await apiClient.get<RawLogDetail>(`/api/v1/logs/${id}`, {
    cache: 'no-store',
    auth: true,
  })

  return normalizeAuditLogDetail(response)
}

export async function getLogLevels(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<{ data: string[] }>>('/api/v1/logs/levels', {
    cache: 'no-store',
    auth: true,
  })

  return Array.isArray(response.data) ? response.data : []
}

export async function getLogCategories(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<{ data: string[] }>>('/api/v1/logs/categories', {
    cache: 'no-store',
    auth: true,
  })

  if (!Array.isArray(response.data)) {
    return []
  }

  return Array.from(new Set(response.data.map((category) => normalizeCategory(category))))
}

export async function clearOldLogs(retentionDays: number) {
  return apiClient.delete<ApiResponse<{ deleted: number; retentionDays: number }>>('/api/v1/logs', {
    query: { retentionDays },
    auth: true,
  })
}
