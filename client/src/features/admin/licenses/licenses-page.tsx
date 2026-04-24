'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, CalendarClock, FileKey, MoreVertical, ShieldAlert } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminListLoader } from '@/features/admin/components/admin-list-loader'
import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/admin/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'
import { formatDate } from '@/lib/format'

import { LicenseDetailDrawer } from './license-detail-drawer'
import { LicenseFormModal } from './components/license-form-modal'
import { LicenseToolbar } from './components/license-toolbar'
import type { LicenseDirectoryRow } from './hooks/use-license-directory'
import { useLicenseDirectory } from './hooks/use-license-directory'

function statusVariant(status: LicenseDirectoryRow['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'EXPIRED':
      return 'destructive'
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'outline'
    default:
      return 'outline'
  }
}

function typeLabel(type: LicenseDirectoryRow['type'] | null | undefined) {
  if (!type) return 'Unknown'
  return type.charAt(0) + type.slice(1).toLowerCase()
}

function statIconFor(index: number) {
  return [FileKey, ShieldAlert, Building2, CalendarClock][index] ?? FileKey
}

export function LicensesPage() {
  const directory = useLicenseDirectory()

  const columns: ColumnDef<LicenseDirectoryRow>[] = useMemo(
    () => [
      {
        accessorKey: 'key',
        header: 'License Key',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.key}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Plan',
        cell: ({ row }) => <Badge variant="outline">{typeLabel(row.original.type)}</Badge>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)} className={row.original.status === 'ACTIVE' ? 'bg-[#1B9C85] hover:bg-[#1B9C85]/90' : ''}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'business',
        header: 'Business',
        cell: ({ row }) => row.original.business?.name ?? '—',
      },
      {
        accessorKey: 'issuedAt',
        header: 'Issued',
        cell: ({ row }) => formatDate(row.original.issuedAt),
      },
      {
        accessorKey: 'expiresAt',
        header: 'Expires',
        cell: ({ row }) => (row.original.expiresAt ? formatDate(row.original.expiresAt) : '—'),
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
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(row.original.key).catch(() => {
                      // ignore copy failures
                    })
                  }}
                >
                  Copy license key
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => directory.openDetailDrawer(row.original)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => directory.openEditModal(row.original)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void directory.handleSuspend(row.original.id)}
                  disabled={row.original.status === 'SUSPENDED' || row.original.status === 'CANCELLED'}
                >
                  Suspend
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void directory.handleRevoke(row.original.id)}
                  disabled={row.original.status === 'CANCELLED'}
                >
                  Revoke
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => directory.requestDelete(row.original)}
                  className="text-rose-600 focus:text-rose-600"
                >
                  Delete
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
        { label: 'Active', value: directory.stats.active },
        { label: 'Expired', value: directory.stats.expired },
        { label: 'Suspended', value: directory.stats.suspended },
        { label: 'Expiring Soon', value: directory.stats.expiringSoon },
      ]
    : []

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1>License Management</h1>
            <p className="text-muted-foreground">Manage license keys, validity, and assignments</p>
          </div>
          <Button onClick={directory.openCreateModal}>
            <FileKey className="mr-2 h-4 w-4" />
            Create License
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <CardTitle>Active Licenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <LicenseToolbar
              searchQuery={directory.searchQuery}
              typeFilter={directory.typeFilter}
              statusFilter={directory.statusFilter}
              issuedFrom={directory.issuedFrom}
              issuedTo={directory.issuedTo}
              expiresFrom={directory.expiresFrom}
              expiresTo={directory.expiresTo}
              onSearchChange={directory.setSearchQuery}
              onTypeChange={directory.setTypeFilter}
              onStatusChange={directory.setStatusFilter}
              onIssuedFromChange={directory.setIssuedFrom}
              onIssuedToChange={directory.setIssuedTo}
              onExpiresFromChange={directory.setExpiresFrom}
              onExpiresToChange={directory.setExpiresTo}
            />

            {directory.isInitialLoading ? (
              <AdminListLoader label="Loading licenses..." />
            ) : directory.error && !directory.rows.length ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Failed to load licenses. Check your connection or permissions and try again.
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
                emptyMessage="No licenses found matching your criteria"
                manualPagination
                pageCount={directory.meta?.totalPages ?? 0}
                pagination={{
                  pageIndex: directory.pageIndex,
                  pageSize: directory.pageSize,
                  onPageChange: directory.setPageIndex,
                  onPageSizeChange: directory.setPageSize,
                  pageSizeOptions: [10, 20, 30, 50],
                }}
                sorting={directory.sorting}
                onSortingChange={directory.setSorting}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <LicenseDetailDrawer
        license={directory.selectedLicense}
        open={directory.isDetailOpen}
        isLoading={directory.detailLoading}
        onClose={directory.closeDetailDrawer}
        onEdit={() => {
          if (directory.selectedLicense) {
            directory.openEditModal(directory.selectedLicense)
          }
        }}
        onDelete={() => {
          if (directory.selectedLicense) {
            directory.requestDelete(directory.selectedLicense)
          }
        }}
      />

      <LicenseFormModal
        open={directory.isFormOpen}
        mode={directory.editingLicense ? 'edit' : 'create'}
        license={directory.editingLicense}
        onOpenChange={(open) => {
          if (!open) {
            directory.closeFormModal()
          }
        }}
        onSubmit={directory.handleSubmit}
        isSubmitting={directory.isSaving}
      />

      <ConfirmationDialog
        open={directory.confirmDialog.isOpen}
        onClose={directory.resetConfirmDialog}
        onConfirm={() => void directory.handleConfirmDelete()}
        title="Delete license"
        description={`Are you sure you want to delete "${directory.confirmDialog.license?.key}"? This action cannot be undone.`}
        actionLabel={directory.isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
      />
    </>
  )
}
