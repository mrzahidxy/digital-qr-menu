'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Activity,
  AlertTriangle,
  Bug,
  Clock3,
  MoreVertical,
  RefreshCw,
  ScrollText,
} from 'lucide-react'

import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { AdminListLoader } from '@/features/admin/components/admin-list-loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/admin/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'

import { AuditLogDetailDrawer } from './components/log-detail-drawer'
import { LogToolbar } from './components/log-toolbar'
import type { LogDirectoryRow } from './hooks/use-logs-directory'
import { useLogsDirectory } from './hooks/use-logs-directory'

function levelVariant(level: LogDirectoryRow['level']) {
  switch (level) {
    case 'ERROR':
      return 'destructive'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'success'
    case 'DEBUG':
      return 'default'
    default:
      return 'outline'
  }
}

function statIconFor(index: number) {
  return [ScrollText, AlertTriangle, Bug, Activity, Clock3][index] ?? ScrollText
}

export function LogsPage() {
  const directory = useLogsDirectory()

  const columns: ColumnDef<LogDirectoryRow>[] = useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => <span className="text-sm">{row.original.timestampLabel}</span>,
      },
      {
        accessorKey: 'actorLabel',
        header: 'Actor',
      },
      {
        accessorKey: 'entityTypeLabel',
        header: 'Entity',
      },
      {
        accessorKey: 'actionLabel',
        header: 'Action',
      },
      {
        accessorKey: 'contextLabel',
        header: 'Context',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[26rem] text-sm text-muted-foreground">
            {row.original.contextLabel}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => <Badge variant={levelVariant(row.original.level)}>{row.original.level}</Badge>,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => directory.openDetailDrawer(row.original)}>
                  View details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [directory]
  )

  const stats = directory.stats
    ? [
        { label: 'Total', value: directory.stats.total },
        { label: 'Errors', value: directory.stats.error },
        { label: 'Warnings', value: directory.stats.warn },
        { label: 'Info', value: directory.stats.info },
        { label: 'Debug', value: directory.stats.debug },
      ]
    : []

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>Audit Logs</h1>
            <p className="text-muted-foreground">
              Inspect live system logs, filter by context, and clear old entries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void directory.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat, index) => {
            const Icon = statIconFor(index)
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[1.5rem]">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <LogToolbar
              searchQuery={directory.searchQuery}
              levelFilter={directory.levelFilter}
              categoryFilter={directory.categoryFilter}
              userIdFilter={directory.userIdFilter}
              dateFrom={directory.dateFrom}
              dateTo={directory.dateTo}
              retentionDays={directory.retentionDays}
              levelOptions={directory.levelOptions}
              categoryOptions={directory.categoryOptions}
              onSearchChange={directory.setSearchQuery}
              onLevelChange={directory.setLevelFilter}
              onCategoryChange={directory.setCategoryFilter}
              onUserIdChange={directory.setUserIdFilter}
              onDateFromChange={directory.setDateFrom}
              onDateToChange={directory.setDateTo}
              onRetentionDaysChange={directory.setRetentionDays}
              onClearLogs={directory.openClearDialog}
            />

            {directory.isInitialLoading ? (
              <AdminListLoader label="Loading audit logs..." />
            ) : directory.error && !directory.rows.length ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Failed to load logs. Check your connection or permissions and try again.
                </p>
                <Button variant="outline" onClick={() => void directory.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={directory.rows}
                isLoading={directory.isFetching}
                emptyMessage="No logs found matching your criteria"
                manualPagination
                pageCount={directory.meta?.totalPages ?? 0}
                pagination={{
                  pageIndex: directory.pageIndex,
                  pageSize: directory.pageSize,
                  onPageChange: directory.setPageIndex,
                  onPageSizeChange: directory.setPageSize,
                  pageSizeOptions: [10, 20, 30, 50, 100],
                }}
                sorting={directory.sorting}
                onSortingChange={directory.setSorting}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AuditLogDetailDrawer
        log={directory.selectedLog}
        open={directory.isDetailOpen}
        isLoading={directory.detailLoading}
        onClose={directory.closeDetailDrawer}
      />

      <ConfirmationDialog
        open={directory.clearDialog.isOpen}
        onClose={directory.closeClearDialog}
        onConfirm={() => void directory.handleConfirmClear()}
        title="Clear old logs"
        description={`This will permanently delete logs older than ${directory.retentionDays} days.`}
        actionLabel={directory.isClearing ? 'Clearing...' : 'Clear logs'}
        variant="destructive"
      />
    </>
  )
}
