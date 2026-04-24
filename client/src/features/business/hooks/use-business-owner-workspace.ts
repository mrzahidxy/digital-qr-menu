'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  getBusinessMenuWorkspaceSummary,
  getBusinessWorkspace,
  type BusinessMenuWorkspaceSummary,
  type BusinessWorkspaceResponse,
} from '../api/business-client'

type WorkspacePayload = {
  workspace: BusinessWorkspaceResponse
  menuSummary: BusinessMenuWorkspaceSummary
}

export function useBusinessOwnerWorkspace() {
  const { data: session, status: sessionStatus } = useSession()

  const isSessionLoading = sessionStatus === 'loading'
  const isAuthenticated =
    sessionStatus === 'authenticated' && session?.accessTokenExpired !== true
  const businessId = session?.user?.businessId ?? null
  const canLoadWorkspace = isAuthenticated && Boolean(businessId)

  const preflightError = useMemo(() => {
    if (isSessionLoading) return null
    if (!isAuthenticated)
      return new Error('You must be logged in to access the business workspace.')
    if (!businessId)
      return new Error('Your account is not linked to a business workspace.')
    return null
  }, [businessId, isAuthenticated, isSessionLoading])

  const workspaceQuery = useQuery({
    queryKey: ['business-owner', 'workspace', businessId],
    queryFn: async () => {
      if (!businessId) {
        throw new Error('Missing business ID in session. Cannot load business workspace.')
      }

      const [workspace, menuSummary] = await Promise.all([
        getBusinessWorkspace(businessId, {
          recentOrdersLimit: 100,
          recentStaffLimit: 20,
        }),
        getBusinessMenuWorkspaceSummary(businessId).catch(() => ({
          hasMenus: false,
          hasPublishedMenu: false,
          activeMenuItems: 0,
        })),
      ])

      return {
        workspace,
        menuSummary,
      } satisfies WorkspacePayload
    },
    enabled: canLoadWorkspace,
    refetchInterval: canLoadWorkspace ? 30_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  })

  const workspace = workspaceQuery.data?.workspace
  const menuSummary = workspaceQuery.data?.menuSummary
  const orders = useMemo(() => workspace?.recentOrders ?? [], [workspace?.recentOrders])
  const staff = useMemo(() => workspace?.recentStaff ?? [], [workspace?.recentStaff])

  const business = workspace?.business ?? null
  const licenses = useMemo(
    () => ({
      stats: {
        active: workspace?.metrics.activeLicenseCount ?? 0,
      },
    }),
    [workspace?.metrics.activeLicenseCount],
  )

  const metrics = useMemo(() => {
    const source = workspace?.metrics

    return {
      totalOrders: source?.totalOrders ?? 0,
      ordersLast30d: source?.ordersLast30d ?? 0,
      activeOrders: source?.activeOrders ?? 0,
      staffCount: source?.staffCount ?? staff.length,
      activeLicense: source?.activeLicenseCount ?? licenses.stats.active,
      pendingOrders: source?.pendingOrders ?? 0,
      completedOrders: source?.completedOrders ?? 0,
      cancelledOrders: source?.cancelledOrders ?? 0,
      activeMenuItems: menuSummary?.activeMenuItems ?? 0,
      hasPublishedMenu: menuSummary?.hasPublishedMenu ?? false,
      hasMenus: menuSummary?.hasMenus ?? false,
    }
  }, [
    licenses.stats.active,
    menuSummary?.activeMenuItems,
    menuSummary?.hasMenus,
    menuSummary?.hasPublishedMenu,
    staff.length,
    workspace?.metrics,
  ])

  const error = preflightError ?? workspaceQuery.error ?? null

  return {
    businessId,
    business,
    staff,
    orders,
    licenses,
    metrics,
    error,
    isLoading: isSessionLoading || workspaceQuery.isLoading,
    isFetching: workspaceQuery.isFetching,
    lastUpdatedAt: workspaceQuery.dataUpdatedAt,
    isAuthenticated,
    canLoadWorkspace,
    businessQuery: workspaceQuery,
    staffQuery: workspaceQuery,
    ordersQuery: workspaceQuery,
    licensesQuery: workspaceQuery,
  }
}
