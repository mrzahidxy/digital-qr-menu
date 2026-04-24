'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { formatDate } from '@/lib/format'

import {
  createBusiness,
  deleteBusiness,
  fetchBusinesses,
  getBusinessById,
  updateBusiness,
  type CreateBusinessInput,
  type BusinessListFilters,
  type BusinessSummary,
} from '../api/restaurant-client'
import { businessKeys } from '../api/restaurant-keys'
import type { RestaurantActivityFilter } from '../components/restaurant-toolbar'
import type { RestaurantFormValues } from '../components/restaurant-form-dialog'

export type RestaurantConfirmAction = 'delete'

type ConfirmDialogState = {
  isOpen: boolean
  restaurant: BusinessSummary | null
  action: RestaurantConfirmAction
}

const defaultConfirmState: ConfirmDialogState = {
  isOpen: false,
  restaurant: null,
  action: 'delete',
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

function mapRestaurant(restaurant: BusinessSummary) {
  return {
    ...restaurant,
    createdDate: formatDate(restaurant.createdAt),
    updatedDate: formatDate(restaurant.updatedAt),
    activityLabel: restaurant.totalOrders > 0 ? 'Active' : 'Quiet',
  }
}

export type RestaurantDirectoryRow = ReturnType<typeof mapRestaurant>

export function useRestaurantsDirectory() {
  const queryClient = useQueryClient()
  const hasShownListError = useRef(false)
  const hasShownDetailError = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState<RestaurantActivityFilter>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<BusinessSummary | null>(null)
  const [detailSelection, setDetailSelection] = useState<{
    id: string | null
    restaurant: BusinessSummary | null
  }>({
    id: null,
    restaurant: null,
  })
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmState)

  const deferredSearch = useDeferredValue(searchQuery)

  const filters = useMemo<Partial<BusinessListFilters>>(() => {
    const query: Partial<BusinessListFilters> = {
      page: pageIndex + 1,
      limit: pageSize,
    }

    const trimmedSearch = deferredSearch.trim()
    if (trimmedSearch) {
      query.search = trimmedSearch
    }

    return query
  }, [deferredSearch, pageIndex, pageSize])

  const listQuery = useQuery({
    queryKey: businessKeys.list(filters),
    queryFn: () => fetchBusinesses(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: detailSelection.id ? businessKeys.detail(detailSelection.id) : businessKeys.detail(''),
    queryFn: () => getBusinessById(detailSelection.id ?? ''),
    enabled: Boolean(detailSelection.id),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (listQuery.error && !hasShownListError.current) {
      toast.error('Failed to load businesses')
      hasShownListError.current = true
    } else if (!listQuery.error && hasShownListError.current) {
      hasShownListError.current = false
    }
  }, [listQuery.error])

  useEffect(() => {
    if (detailQuery.error && !hasShownDetailError.current) {
      toast.error('Failed to load business details')
      hasShownDetailError.current = true
    } else if (!detailQuery.error && hasShownDetailError.current) {
      hasShownDetailError.current = false
    }
  }, [detailQuery.error])

  const createMutation = useMutation({
    mutationFn: createBusiness,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'Business created successfully')
      await queryClient.invalidateQueries({ queryKey: businessKeys.all })
      setIsCreateOpen(false)
      setPageIndex(0)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create business'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RestaurantFormValues }) =>
      updateBusiness(id, { name: input.name }),
    onSuccess: async (response) => {
      toast.success(response.message ?? 'Business updated successfully')
      await queryClient.invalidateQueries({ queryKey: businessKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: businessKeys.detail(detailSelection.id) })
      }
      setIsCreateOpen(false)
      setEditingRestaurant(null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update business'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBusiness,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'Business deleted successfully')
      await queryClient.invalidateQueries({ queryKey: businessKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: businessKeys.detail(detailSelection.id) })
      }
      if (confirmDialog.restaurant?.id === detailSelection.id) {
        setDetailSelection({ id: null, restaurant: null })
      }
      setConfirmDialog(defaultConfirmState)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete business'))
    },
  })

  const restaurants = useMemo<RestaurantDirectoryRow[]>(() => {
    return (listQuery.data?.data ?? [])
      .filter((restaurant) => {
        if (activityFilter === 'all') {
          return true
        }

        const isActive = restaurant.totalOrders > 0
        return activityFilter === 'active' ? isActive : !isActive
      })
      .map(mapRestaurant)
  }, [activityFilter, listQuery.data?.data])

  const selectedRestaurant = detailQuery.data ?? detailSelection.restaurant

  const isInitialLoading = listQuery.isLoading && !listQuery.data

  const openCreateDialog = () => {
    setEditingRestaurant(null)
    setIsCreateOpen(true)
  }

  const openEditDialog = (restaurant: BusinessSummary) => {
    setEditingRestaurant(restaurant)
    setIsCreateOpen(true)
  }

  const handleCreateRestaurant = (values: RestaurantFormValues) => {
    if (!values.ownerId) {
      toast.error('Owner user ID is required')
      return
    }

    createMutation.mutate({
      name: values.name,
      ownerId: values.ownerId,
    } satisfies CreateBusinessInput)
  }

  const handleUpdateRestaurant = (values: RestaurantFormValues) => {
    if (!editingRestaurant) {
      return
    }

    updateMutation.mutate({
      id: editingRestaurant.id,
      input: values,
    })
  }

  const requestDelete = (restaurant: BusinessSummary) => {
    setConfirmDialog({
      isOpen: true,
      restaurant,
      action: 'delete',
    })
  }

  const handleConfirmDelete = () => {
    if (!confirmDialog.restaurant) {
      return
    }

    deleteMutation.mutate(confirmDialog.restaurant.id)
  }

  const openRestaurantDetails = (restaurant: BusinessSummary) => {
    setDetailSelection({
      id: restaurant.id,
      restaurant,
    })
  }

  const closeRestaurantDetails = () => {
    setDetailSelection({ id: null, restaurant: null })
  }

  const resetConfirmDialog = () => setConfirmDialog(defaultConfirmState)

  return {
    activityFilter,
    setActivityFilter: (value: RestaurantActivityFilter) => {
      setActivityFilter(value)
      setPageIndex(0)
    },
    searchQuery,
    setSearchQuery: (value: string) => {
      setSearchQuery(value)
      setPageIndex(0)
    },
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    restaurants,
    meta: listQuery.data?.meta,
    isInitialLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
    selectedRestaurant,
    isDetailOpen: Boolean(detailSelection.id),
    detailLoading: detailQuery.isLoading,
    openRestaurantDetails,
    closeRestaurantDetails,
    openCreateDialog,
    openEditDialog,
    isCreateOpen,
    closeCreateDialog: () => {
      setIsCreateOpen(false)
      setEditingRestaurant(null)
    },
    editingRestaurant,
    handleCreateRestaurant,
    handleUpdateRestaurant,
    isCreateSubmitting: createMutation.isPending,
    isUpdateSubmitting: updateMutation.isPending,
    requestDelete,
    confirmDialog,
    resetConfirmDialog,
    handleConfirmDelete,
    isDeleteSubmitting: deleteMutation.isPending,
  }
}
