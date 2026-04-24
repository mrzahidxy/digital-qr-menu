'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useBusinessOwnerWorkspace } from '../hooks/use-business-owner-workspace'
import { SectionCard } from './components/section-card'
import { CommandCenterActions } from './components/command-center-actions'
import { DashboardHeader } from './components/dashboard-header'
import { DashboardStats } from './components/dashboard-stats'

export default function DashboardPage() {
  const workspace = useBusinessOwnerWorkspace()

  const ownerName = workspace.business?.name ?? 'Business Owner'
  const firstName = ownerName.split(/\s+/)[0] ?? ownerName

  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return workspace.orders.filter((order) => order.createdAt.startsWith(today)).length
  }, [workspace.orders])

  const stats = [
    {
      label: 'Total Orders',
      value: String(workspace.metrics.totalOrders).padStart(2, '0'),
      helper: `${workspace.metrics.activeOrders} active`,
    },
    {
      label: 'Orders Today',
      value: String(todayOrders).padStart(2, '0'),
      helper: todayOrders > 0 ? 'From current day activity' : 'No orders yet today',
      trendUp: todayOrders > 0,
    },
    {
      label: 'Active Menu Items',
      value: String(workspace.metrics.activeMenuItems).padStart(2, '0'),
      helper: workspace.metrics.hasMenus ? 'Available on selected menu' : 'No menu configured yet',
    },
    {
      label: 'Menu Published',
      value: workspace.metrics.hasPublishedMenu ? 'Yes' : 'No',
      helper: workspace.metrics.hasMenus ? 'At least one menu is published' : 'Create a menu to publish',
      badge: workspace.metrics.hasPublishedMenu ? 'Live' : 'Draft',
    },
  ]

  if (workspace.isLoading && !workspace.business) {
    return (
      <SectionCard title="Dashboard" subtitle="Loading workspace data">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      </SectionCard>
    )
  }

  if (workspace.error && !workspace.business) {
    return (
      <SectionCard title="Dashboard" subtitle="Unable to load workspace">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {workspace.error instanceof Error ? workspace.error.message : 'Workspace data is unavailable.'}
          </p>
          <Button variant="outline" onClick={() => void workspace.businessQuery.refetch()}>
            Retry
          </Button>
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-9">
      <DashboardHeader
        title={`Good morning, ${firstName}`}
        description={`Workspace summary for ${ownerName}.`}
        tone="flat"
      />

      <DashboardStats stats={stats} />

      <CommandCenterActions />
    </div>
  )
}
