'use client'

import { useMemo } from 'react'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { AdminListLoader } from '@/features/admin/components/admin-list-loader'
import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/admin/components/ui/card'

import { createUsersColumns } from './columns'
import { UserModal } from './user-modal'
import { UsersTableHeader } from './users-table-header'
import type { UsersTableContext } from './use-users-table'

type UsersTableProps = {
  table: UsersTableContext
}

export function UsersTable({ table }: UsersTableProps) {
  const columns = useMemo(
    () =>
      createUsersColumns({
        onRequestAction: table.requestAction,
        onRoleChange: table.handleRoleChange,
        isAdmin: table.isAdmin,
        currentUserId: table.currentUserId,
        isMutatingAction: table.isMutatingAction,
        isRoleUpdating: table.isRoleUpdating,
      }),
    [
      table.currentUserId,
      table.handleRoleChange,
      table.isAdmin,
      table.isMutatingAction,
      table.isRoleUpdating,
      table.requestAction,
    ]
  )

  const toolbar = (
    <UsersTableHeader
      searchQuery={table.searchQuery}
      roleFilter={table.roleFilter}
      onSearchChange={table.setSearchQuery}
      onRoleFilterChange={table.setRoleFilter}
    />
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {table.isInitialLoading ? (
            <AdminListLoader label="Loading users..." />
          ) : table.error && !table.rows.length ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Failed to load users. Check your connection or permissions and try again.
              </p>
              <Button variant="outline" onClick={() => void table.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={table.rows}
              toolbar={toolbar}
              isLoading={table.isFetching}
              emptyMessage="No users found. Adjust filters or create a new user."
              manualPagination
              pageCount={table.meta?.totalPages ?? 0}
              pagination={{
                pageIndex: table.pageIndex,
                pageSize: table.pageSize,
                onPageChange: table.setPageIndex,
                onPageSizeChange: table.setPageSize,
                pageSizeOptions: [10, 20, 30, 50],
              }}
              sorting={table.sorting}
              onSortingChange={table.setSorting}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={table.dialog.isOpen}
        onClose={table.resetDialog}
        onConfirm={table.handleConfirmAction}
        title="Delete user"
        description={`Are you sure you want to delete "${table.dialog.user?.email}"? This action cannot be undone.`}
        actionLabel={table.isMutatingAction ? 'Processing...' : 'Delete'}
        variant="destructive"
      />

      <UserModal
        open={table.isCreateOpen}
        onOpenChange={table.handleCreateOpenChange}
        onSubmit={table.handleCreateUser}
        isSubmitting={table.isCreating}
        canManage={table.isAdmin}
      />
    </>
  )
}
