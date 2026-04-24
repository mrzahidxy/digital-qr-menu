'use client'

import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Users2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'
import { StatCard } from '../dashboard/components/stat-card'
import { useBusinessOwnerWorkspace } from '../hooks/use-business-owner-workspace'

export default function AnalyticsPage() {
  const workspace = useBusinessOwnerWorkspace()

  const stats = [
    {
      label: 'Total Orders',
      value: workspace.metrics.totalOrders,
      helper: `${workspace.metrics.ordersLast30d} in the last 30 days`,
      icon: <ShoppingBag className="h-5 w-5" />,
      trend: { value: `${workspace.metrics.activeOrders} active`, isPositive: true },
    },
    {
      label: 'Staff',
      value: workspace.metrics.staffCount,
      helper: 'Assigned to this business',
      icon: <Users2 className="h-5 w-5" />,
    },
    {
      label: 'License',
      value: workspace.metrics.activeLicense,
      helper: 'Active license records',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
  ]

  const orderStatusStats = [
    {
      label: 'Active',
      value: workspace.metrics.activeOrders,
      helper: 'Received, preparing, or ready',
    },
    {
      label: 'Received',
      value: workspace.metrics.pendingOrders,
      helper: 'New orders waiting for action',
    },
    {
      label: 'Completed',
      value: workspace.metrics.completedOrders,
      helper: 'Fulfilled guest orders',
    },
    {
      label: 'Cancelled',
      value: workspace.metrics.cancelledOrders,
      helper: 'Cancelled guest orders',
    },
  ]

  const lastUpdated = workspace.lastUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(workspace.lastUpdatedAt))
    : 'Waiting for first sync'

  if (workspace.isLoading && !workspace.business) {
    return (
      <SectionCard title="Analytics" subtitle="Loading live business metrics">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analytics...
        </div>
      </SectionCard>
    )
  }

  if (workspace.error && !workspace.business) {
    return (
      <SectionCard title="Analytics" subtitle="Unable to load live metrics">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {workspace.error instanceof Error
              ? workspace.error.message
              : 'Analytics data is unavailable.'}
          </p>
          <Button
            variant="outline"
            onClick={() => void workspace.businessQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Analytics"
        description={`Live business metrics from the workspace API. Last synced ${lastUpdated}.`}
        actions={
          <Button
            variant="outline"
            disabled={workspace.isFetching}
            onClick={() => void workspace.businessQuery.refetch()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${workspace.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <SectionCard title="Order Status">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          {orderStatusStats.map((stat) => (
            <div key={stat.label} className="border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
