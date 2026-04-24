'use client'

import Link from 'next/link'
import type { Route } from 'next'
import type { ColumnDef } from '@tanstack/react-table'
import { Database, ExternalLink, MoreVertical } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminListLoader } from '@/features/admin/components/admin-list-loader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/admin/components/ui/card'
import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'

import { RestaurantDetailDrawer } from './restaurant-detail-drawer'
import { RestaurantFormDialog } from './components/restaurant-form-dialog'
import { RestaurantToolbar } from './components/restaurant-toolbar'
import { useRestaurantsDirectory, type RestaurantDirectoryRow } from './hooks/use-restaurants-directory'

function getPublicMenuHref(businessId: string) {
  return `/menu/${encodeURIComponent(businessId)}`
}

export function RestaurantsPage() {
  const directory = useRestaurantsDirectory()

  const columns: ColumnDef<RestaurantDirectoryRow>[] = [
    {
      accessorKey: 'name',
      header: 'Business',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            href={getPublicMenuHref(row.original.id) as Route}
            target="_blank"
            rel="noopener noreferrer"
            title={`View public menu for ${row.original.name}`}
            aria-label={`View public menu for ${row.original.name} in a new tab`}
            className="inline-flex items-center gap-1 font-semibold text-slate-900 transition-colors hover:text-teal-600 hover:underline"
          >
            <span>{row.original.name}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span className="text-sm text-slate-500">ID {row.original.id}</span>
        </div>
      ),
    },
    {
      id: 'ownerEmail',
      header: 'Owner Email',
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.owner?.email ?? '—'}</span>,
    },
    {
      accessorKey: 'totalMenus',
      header: 'Menus',
      cell: ({ row }) => <span>{row.original.totalMenus}</span>,
    },
    {
      accessorKey: 'publishedMenus',
      header: 'Published Menus',
      cell: ({ row }) => <span>{row.original.publishedMenus}</span>,
    },
    {
      id: 'activity',
      header: 'Activity',
      cell: ({ row }) => (
        <Badge
          variant={row.original.totalOrders > 0 ? 'default' : 'outline'}
          className={row.original.totalOrders > 0 ? 'bg-[#1B9C85] hover:bg-[#1B9C85]/90' : ''}
        >
          {row.original.totalOrders > 0 ? 'Active' : 'Quiet'}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: ({ row }) => row.original.createdDate,
    },
    {
      id: 'lastActiveAt',
      header: 'Status',
      cell: ({ row }) => row.original.status,
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
                  navigator.clipboard.writeText(row.original.id).catch(() => {
                    // ignore copy failures
                  })
                }}
              >
                Copy business ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => directory.openRestaurantDetails(row.original)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => directory.openEditDialog(row.original)}>
                Edit
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
  ]

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1>Businesses</h1>
            <p className="text-muted-foreground">Manage cafes, owners, published menus, and activity.</p>
          </div>
          <Button onClick={directory.openCreateDialog}>
            <Database className="mr-2 h-4 w-4" />
            Create Business
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {directory.isInitialLoading ? (
              <AdminListLoader label="Loading businesses..." />
            ) : directory.error && !directory.restaurants.length ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Failed to load businesses. Check your connection or permissions and try again.
                </p>
                <Button variant="outline" onClick={() => void directory.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={directory.restaurants}
                emptyMessage="No businesses found for the current filters."
                toolbar={
                  <RestaurantToolbar
                    searchQuery={directory.searchQuery}
                    activityFilter={directory.activityFilter}
                    onSearchChange={directory.setSearchQuery}
                    onActivityChange={directory.setActivityFilter}
                  />
                }
                isLoading={directory.isFetching}
                manualPagination
                pageCount={directory.meta?.totalPages ?? 0}
                pagination={{
                  pageIndex: directory.pageIndex,
                  pageSize: directory.pageSize,
                  onPageChange: directory.setPageIndex,
                  onPageSizeChange: directory.setPageSize,
                  pageSizeOptions: [10, 20, 30, 50],
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <RestaurantDetailDrawer
        restaurant={directory.selectedRestaurant}
        open={directory.isDetailOpen}
        isLoading={directory.detailLoading}
        onClose={directory.closeRestaurantDetails}
        onEdit={() => {
          if (directory.selectedRestaurant) {
            directory.openEditDialog(directory.selectedRestaurant)
          }
        }}
        onDelete={() => {
          if (directory.selectedRestaurant) {
            directory.requestDelete(directory.selectedRestaurant)
          }
        }}
      />

      <RestaurantFormDialog
        open={directory.isCreateOpen}
        mode={directory.editingRestaurant ? 'edit' : 'create'}
        restaurant={directory.editingRestaurant}
        onOpenChange={(open) => {
          if (!open) {
            directory.closeCreateDialog()
          }
        }}
        onSubmit={(values) => {
          if (directory.editingRestaurant) {
            directory.handleUpdateRestaurant(values)
          } else {
            directory.handleCreateRestaurant(values)
          }
        }}
        isSubmitting={directory.isCreateSubmitting || directory.isUpdateSubmitting}
      />

      <ConfirmationDialog
        open={directory.confirmDialog.isOpen}
        onClose={directory.resetConfirmDialog}
        onConfirm={directory.handleConfirmDelete}
        title="Delete business"
        description={`Are you sure you want to delete "${directory.confirmDialog.restaurant?.name}"? This action cannot be undone.`}
        actionLabel={directory.isDeleteSubmitting ? 'Deleting...' : 'Delete'}
        variant="destructive"
      />
    </>
  )
}
