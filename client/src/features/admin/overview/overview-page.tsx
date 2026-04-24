"use client";

import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Building2,
  Database,
  HardDrive,
  Loader2,
  Menu,
  RotateCcw,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/admin/components/ui/card'
import { formatDate } from '@/lib/format'

import { fetchAdminOverview, type AdminOverviewResponse } from './api/admin-client'
import { adminOverviewKeys } from './api/admin-keys'

type DashboardMetric = {
  title: string
  value: string
  icon: LucideIcon
  helper: string
}

const countFormatter = new Intl.NumberFormat('en-US')
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffInSeconds) >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.round(diffInSeconds / secondsInUnit), unit)
    }
  }

  return formatter.format(0, 'second')
}

function formatCompactCount(value: number | string) {
  return compactFormatter.format(Number(value))
}

function formatCount(value: number | string) {
  return countFormatter.format(Number(value))
}

function mapOverviewToMetrics(overview?: AdminOverviewResponse): DashboardMetric[] {
  return [
    {
      title: 'Total Businesses',
      value: overview ? formatCount(overview.totalBusinesses) : '—',
      icon: Building2,
      helper: 'Cafe workspaces in the database',
    },
    {
      title: 'Active Users',
      value: overview ? formatCount(overview.activeUsers) : '—',
      icon: Users,
      helper: 'All non-admin accounts',
    },
    {
      title: 'Storage Used',
      value: overview ? overview.storageUsed : '—',
      icon: HardDrive,
      helper: 'Current PostgreSQL database size',
    },
    {
      title: 'Menus Published',
      value: overview ? formatCount(overview.menusPublished) : '—',
      icon: Menu,
      helper: 'Published menu records across businesses',
    },
    {
      title: 'API Calls (24h)',
      value: overview ? formatCompactCount(overview.apiCallsCount) : '—',
      icon: Activity,
      helper: 'Requests recorded in the last 24 hours',
    },
  ]
}

function OverviewMetricSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex h-[300px] items-end gap-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex-1">
          <div
            className="mx-auto w-full rounded-t-md bg-muted/70"
            style={{ height: `${35 + index * 18}px` }}
          />
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <OverviewMetricSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Requests (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
            <div className="h-10 w-full rounded-md bg-muted" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard Overview</h1>
        <p className="text-muted-foreground">System-wide metrics and status</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Unable to load overview</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The admin overview endpoint could not be reached.
            </p>
          </div>
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}

export function OverviewPage() {
  const hasShownError = useRef(false)

  const {
    data: overview,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: adminOverviewKeys.overview(),
    queryFn: fetchAdminOverview,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    if (error && !hasShownError.current) {
      toast.error('Failed to load admin overview')
      hasShownError.current = true
    } else if (!error && hasShownError.current) {
      hasShownError.current = false
    }
  }, [error])

  const metrics = useMemo(() => mapOverviewToMetrics(overview), [overview])
  const chartData = overview?.apiCallsData ?? []

  if (isLoading && !overview) {
    return <DashboardSkeleton />
  }

  if (error && !overview) {
    return <DashboardErrorState onRetry={() => void refetch()} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1>Dashboard Overview</h1>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground">System-wide metrics and status</p>
          {overview?.lastUpdated ? (
            <p className="text-xs text-muted-foreground">
              Last updated {formatRelativeTime(overview.lastUpdated)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-muted-foreground">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[1.5rem]">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Requests (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E7C86" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0E7C86" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    tickFormatter={(value) => formatDate(String(value))}
                  />
                  <YAxis stroke="#6B7280" tickFormatter={formatCompactCount} />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value: number | string) => [formatCompactCount(value), 'Calls']}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#0E7C86"
                    fillOpacity={1}
                    fill="url(#colorCalls)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No API call data available for the last 7 days.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm">Current PostgreSQL usage</p>
                <p className="text-xs text-muted-foreground">
                  {overview?.lastUpdated
                    ? `Measured ${formatRelativeTime(overview.lastUpdated)}`
                    : 'Waiting for overview data'}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Storage used</span>
                <span className="text-muted-foreground">{overview?.storageUsed ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>API calls (24h)</span>
                <span className="text-muted-foreground">
                  {overview ? formatCount(overview.apiCallsCount) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recent activity</span>
                <span className="text-muted-foreground">
                  {overview ? formatCount(overview.recentActivity.length) : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
