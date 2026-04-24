'use client'

import { apiClient } from '@/lib/api'

export type AdminOverviewChartPoint = {
  date: string
  calls: number
}

export type AdminOverviewRecentActivity = {
  id: string
  createdAt: string
  action: string
  entity: string
  entityId: string | null
  actorId: string | null
  actorType: 'USER' | 'SYSTEM'
  metadata: unknown
  actor: {
    id: string
    email: string
    fullName: string | null
  } | null
}

export type AdminOverviewResponse = {
  totalBusinesses: number
  activeUsers: number
  storageUsed: string
  storageUsedBytes: number
  menusPublished: number
  apiCallsCount: number
  apiCallsData: AdminOverviewChartPoint[]
  recentActivity: AdminOverviewRecentActivity[]
  lastUpdated: string
}

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  return apiClient.get<AdminOverviewResponse>('/api/v1/admin/overview', {
    cache: 'no-store',
    auth: true,
  })
}
