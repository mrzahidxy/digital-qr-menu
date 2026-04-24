'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { formatDate } from '@/lib/format'

import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUserRole,
  type AdminUser,
  type AdminUserRole,
  type UserListFilters,
} from '../../api/user-client'
import { userKeys } from '../../api/user-keys'
import type {
  CreateUserFormValues,
  DialogAction,
  DirectoryUser,
  RoleFilterOption,
} from './types'
import { ROLE_LABELS } from './constants'

type UseUsersTableState = {
  searchQuery: string
  roleFilter: RoleFilterOption
  isCreateOpen: boolean
  dialog: {
    isOpen: boolean
    user?: DirectoryUser
    action?: DialogAction
  }
  pageIndex: number
  pageSize: number
  sorting: SortingState
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function mapUserToDirectoryUser(user: AdminUser): DirectoryUser {
  const roleValue = user.role

  return {
    id: user.id,
    email: user.email,
    name: user.fullName?.trim() || '—',
    roleLabel: ROLE_LABELS[roleValue] ?? toTitleCase(roleValue),
    roleValue,
    createdDate: formatDate(user.createdAt),
    updatedDate: formatDate(user.updatedAt),
    raw: user,
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return fallback
}

export const createUserDefaultValues: CreateUserFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'OWNER',
}

export function useUsersTable() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const [state, setState] = useState<UseUsersTableState>({
    searchQuery: '',
    roleFilter: 'All',
    isCreateOpen: false,
    dialog: { isOpen: false },
    pageIndex: 0,
    pageSize: 10,
    sorting: [{ id: 'createdAt', desc: true }],
  })

  const currentUserId = session?.user?.id ? String(session.user.id) : null
  const currentRole = session?.user?.role
  const isAdmin = currentRole === 'SUPER_ADMIN'
  const deferredSearch = useDeferredValue(state.searchQuery)

  const apiFilters = useMemo<Partial<UserListFilters>>(() => {
    const filters: Partial<UserListFilters> = {
      page: state.pageIndex + 1,
      limit: state.pageSize,
    }

    const trimmedSearch = deferredSearch.trim()
    if (trimmedSearch) {
      filters.search = trimmedSearch
    }

    if (state.roleFilter !== 'All') {
      filters.role = state.roleFilter
    }

    const activeSort = state.sorting[0]
    if (activeSort) {
      filters.sortBy = activeSort.id as UserListFilters['sortBy']
      filters.sortDirection = activeSort.desc ? 'desc' : 'asc'
    }

    return filters
  }, [deferredSearch, state.pageIndex, state.pageSize, state.roleFilter, state.sorting])

  const hasShownError = useRef(false)

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: userKeys.list(apiFilters),
    queryFn: () => fetchUsers(apiFilters),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (error && !hasShownError.current) {
      toast.error('Failed to load users')
      hasShownError.current = true
    } else if (!error && hasShownError.current) {
      hasShownError.current = false
    }
  }, [error])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (response) => {
      toast.success(response.message ?? 'User created successfully')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      setState((prev) => ({
        ...prev,
        isCreateOpen: false,
        pageIndex: 0,
      }))
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to create user'))
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      updateUserRole(id, { role }),
    onSuccess: (response) => {
      toast.success(response.message ?? 'User role updated')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to update user role'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (response) => {
      toast.success(response.message ?? 'User deleted')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to delete user'))
    },
  })

  const rows = useMemo<DirectoryUser[]>(() => (data?.data ?? []).map(mapUserToDirectoryUser), [
    data?.data,
  ])

  const meta = data?.meta
  const isInitialLoading = isLoading && !data

  const setSearchQuery = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: value,
      pageIndex: 0,
    }))
  }, [])

  const setRoleFilter = useCallback((value: RoleFilterOption) => {
    setState((prev) => ({
      ...prev,
      roleFilter: value,
      pageIndex: 0,
    }))
  }, [])

  const setPageIndex = useCallback((pageIndex: number) => {
    setState((prev) => ({
      ...prev,
      pageIndex,
    }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setState((prev) => ({
      ...prev,
      pageSize,
      pageIndex: 0,
    }))
  }, [])

  const setSorting = useCallback((sorting: SortingState) => {
    setState((prev) => ({
      ...prev,
      sorting,
      pageIndex: 0,
    }))
  }, [])

  const requestAction = useCallback(
    (user: DirectoryUser, action: DialogAction) => {
      if (!isAdmin) {
        toast.error('You do not have permission to manage users')
        return
      }

      if (currentUserId && user.id === currentUserId) {
        toast.error('You cannot perform this action on your own account')
        return
      }

      setState((prev) => ({
        ...prev,
        dialog: {
          isOpen: true,
          user,
          action,
        },
      }))
    },
    [currentUserId, isAdmin]
  )

  const resetDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dialog: { isOpen: false },
    }))
  }, [])

  const handleConfirmAction = useCallback(async () => {
    const pendingUser = state.dialog.user
    const pendingAction = state.dialog.action

    if (!pendingUser || !pendingAction || deleteMutation.isPending) {
      return
    }

    try {
      if (pendingAction === 'delete') {
        await deleteMutation.mutateAsync(pendingUser.id)
      }

      resetDialog()
    } catch {
      // handled via toast in mutation callbacks
    }
  }, [deleteMutation, resetDialog, state.dialog.action, state.dialog.user])

  const handleRoleChange = useCallback(
    async (user: DirectoryUser, role: AdminUserRole) => {
      if (!isAdmin) {
        toast.error('You do not have permission to update roles')
        return
      }

      if (currentUserId && user.id === currentUserId) {
        toast.error('You cannot change your own role')
        return
      }

      if (role === user.roleValue || roleMutation.isPending) {
        return
      }

      try {
        await roleMutation.mutateAsync({ id: user.id, role })
      } catch {
        // handled in mutation error
      }
    },
    [currentUserId, isAdmin, roleMutation]
  )

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open && !isAdmin) {
        toast.error('You do not have permission to create users')
        return
      }

      setState((prev) => ({
        ...prev,
        isCreateOpen: open,
      }))
    },
    [isAdmin]
  )

  const handleCreateUser = useCallback(
    async (values: CreateUserFormValues) => {
      if (!isAdmin) {
        toast.error('You do not have permission to create users')
        return
      }

      const fullName = values.name.trim()
      if (!fullName) {
        toast.error('Full name is required')
        return
      }

      await createMutation.mutateAsync({
        email: values.email,
        password: values.password,
        role: values.role,
        fullName,
      })
    },
    [createMutation, isAdmin]
  )

  const openCreateModal = useCallback(() => handleCreateOpenChange(true), [handleCreateOpenChange])
  const closeCreateModal = useCallback(() => handleCreateOpenChange(false), [handleCreateOpenChange])

  return {
    rows,
    meta,
    isInitialLoading,
    isFetching,
    isAdmin,
    currentUserId,
    searchQuery: state.searchQuery,
    roleFilter: state.roleFilter,
    setSearchQuery,
    setRoleFilter,
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
    setPageIndex,
    setPageSize,
    sorting: state.sorting,
    setSorting,
    requestAction,
    resetDialog,
    handleConfirmAction,
    handleRoleChange,
    dialog: state.dialog,
    isMutatingAction: deleteMutation.isPending,
    isRoleUpdating: roleMutation.isPending,
    isCreateOpen: state.isCreateOpen,
    openCreateModal,
    closeCreateModal,
    handleCreateOpenChange,
    handleCreateUser,
    isCreating: createMutation.isPending,
    error,
    refetch,
  }
}

export type UsersTableContext = ReturnType<typeof useUsersTable>
