'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SortingState } from '@tanstack/react-table'

import { formatDate } from '@/lib/format'

import {
  assignLicenseToBusiness,
  createLicense,
  deleteLicense,
  fetchLicenses,
  getLicenseById,
  revokeLicense,
  suspendLicense,
  updateLicense,
  type CreateLicenseInput,
  type LicenseKeyDetail,
  type LicenseListFilters,
  type LicenseKey,
  type UpdateLicenseInput,
} from '../api/license-client'
import { licenseKeys } from '../api/license-keys'
import type { LicenseFormValues } from '../components/license-form-modal'

type FilterType = 'all' | 'MONTHLY' | 'YEARLY' | 'LIFETIME'
type FilterStatus = 'all' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'

type ConfirmDialogState = {
  isOpen: boolean
  license: LicenseKey | null
}

const defaultConfirmState: ConfirmDialogState = {
  isOpen: false,
  license: null,
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) return value
  }
  return fallback
}

function mapLicenseRow(license: LicenseKey) {
  return {
    ...license,
    issuedAtLabel: formatDate(license.issuedAt),
    expiresAtLabel: license.expiresAt ? formatDate(license.expiresAt) : '—',
  }
}

export type LicenseDirectoryRow = ReturnType<typeof mapLicenseRow>

export function useLicenseDirectory() {
  const queryClient = useQueryClient()
  const hasShownListError = useRef(false)
  const hasShownDetailError = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [issuedFrom, setIssuedFrom] = useState('')
  const [issuedTo, setIssuedTo] = useState('')
  const [expiresFrom, setExpiresFrom] = useState('')
  const [expiresTo, setExpiresTo] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'issuedAt', desc: true }])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<LicenseKey | LicenseKeyDetail | null>(null)
  const [detailSelection, setDetailSelection] = useState<{ id: string | null; license: LicenseKey | null }>({
    id: null,
    license: null,
  })
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmState)

  const deferredSearch = useDeferredValue(searchQuery)

  const filters = useMemo<Partial<LicenseListFilters>>(() => {
    const query: Partial<LicenseListFilters> = {
      page: pageIndex + 1,
      limit: pageSize,
    }

    const trimmedSearch = deferredSearch.trim()
    if (trimmedSearch) query.search = trimmedSearch
    if (typeFilter !== 'all') query.type = typeFilter
    if (statusFilter !== 'all') query.status = statusFilter
    if (issuedFrom) query.issuedFrom = issuedFrom
    if (issuedTo) query.issuedTo = issuedTo
    if (expiresFrom) query.expiresFrom = expiresFrom
    if (expiresTo) query.expiresTo = expiresTo

    const activeSort = sorting[0]
    if (activeSort) {
      query.sortBy = activeSort.id as LicenseListFilters['sortBy']
      query.sortDirection = activeSort.desc ? 'desc' : 'asc'
    }

    return query
  }, [deferredSearch, expiresFrom, expiresTo, issuedFrom, issuedTo, pageIndex, pageSize, sorting, statusFilter, typeFilter])

  const listQuery = useQuery({
    queryKey: licenseKeys.list(filters),
    queryFn: () => fetchLicenses(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: detailSelection.id ? licenseKeys.detail(detailSelection.id) : licenseKeys.detail(''),
    queryFn: () => getLicenseById(detailSelection.id ?? ''),
    enabled: Boolean(detailSelection.id),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (listQuery.error && !hasShownListError.current) {
      toast.error('Failed to load licenses')
      hasShownListError.current = true
    } else if (!listQuery.error && hasShownListError.current) {
      hasShownListError.current = false
    }
  }, [listQuery.error])

  useEffect(() => {
    if (detailQuery.error && !hasShownDetailError.current) {
      toast.error('Failed to load license details')
      hasShownDetailError.current = true
    } else if (!detailQuery.error && hasShownDetailError.current) {
      hasShownDetailError.current = false
    }
  }, [detailQuery.error])

  const createMutation = useMutation({
    mutationFn: createLicense,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'License created successfully')
      await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
      setIsFormOpen(false)
      setEditingLicense(null)
      setPageIndex(0)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create license'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLicenseInput }) => updateLicense(id, input),
    onSuccess: async (response) => {
      toast.success(response.message ?? 'License updated successfully')
      await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: licenseKeys.detail(detailSelection.id) })
      }
      setIsFormOpen(false)
      setEditingLicense(null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update license'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLicense,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'License deleted successfully')
      await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: licenseKeys.detail(detailSelection.id) })
      }
      setConfirmDialog(defaultConfirmState)
      setDetailSelection({ id: null, license: null })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete license'))
    },
  })

  const suspendMutation = useMutation({
    mutationFn: suspendLicense,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'License suspended successfully')
      await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: licenseKeys.detail(detailSelection.id) })
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to suspend license'))
    },
  })

  const revokeMutation = useMutation({
    mutationFn: revokeLicense,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'License revoked successfully')
      await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
      if (detailSelection.id) {
        await queryClient.invalidateQueries({ queryKey: licenseKeys.detail(detailSelection.id) })
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to revoke license'))
    },
  })

  const rows = useMemo<LicenseDirectoryRow[]>(() => (listQuery.data?.data ?? []).map(mapLicenseRow), [
    listQuery.data?.data,
  ])

  const isInitialLoading = listQuery.isLoading && !listQuery.data
  const selectedLicense = detailQuery.data ?? detailSelection.license

  const openCreateModal = () => {
    setEditingLicense(null)
    setIsFormOpen(true)
  }

  const openEditModal = (license: LicenseKey | LicenseKeyDetail) => {
    setEditingLicense(license)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingLicense(null)
  }

  const openDetailDrawer = (license: LicenseKey) => {
    setDetailSelection({ id: license.id, license })
  }

  const closeDetailDrawer = () => {
    setDetailSelection({ id: null, license: null })
  }

  const requestDelete = (license: LicenseKey) => {
    setConfirmDialog({ isOpen: true, license })
  }

  const resetConfirmDialog = () => setConfirmDialog(defaultConfirmState)

  const handleConfirmDelete = async () => {
    if (!confirmDialog.license) return
    await deleteMutation.mutateAsync(confirmDialog.license.id)
  }

  const handleSuspend = async (licenseId: string) => {
    await suspendMutation.mutateAsync(licenseId)
  }

  const handleRevoke = async (licenseId: string) => {
    await revokeMutation.mutateAsync(licenseId)
  }

  const handleAssign = async (licenseId: string, businessId: string | null) => {
    const normalizedBusinessId = businessId?.trim() || null
    await assignLicenseToBusiness(licenseId, normalizedBusinessId)
    await queryClient.invalidateQueries({ queryKey: licenseKeys.all })
    if (detailSelection.id) {
      await queryClient.invalidateQueries({ queryKey: licenseKeys.detail(detailSelection.id) })
    }
  }

  const handleSubmit = async (values: LicenseFormValues) => {
    const input = {
      key: values.key?.trim() || undefined,
      type: values.type,
      status: values.status,
      issuedAt: values.issuedAt ? new Date(values.issuedAt).toISOString() : undefined,
      expiresAt: new Date(values.expiresAt).toISOString(),
      businessId: values.businessId?.trim() || undefined,
    }

    if (editingLicense) {
      await updateMutation.mutateAsync({
        id: editingLicense.id,
        input,
      })
    } else {
      const createInput: CreateLicenseInput = {
        key: input.key,
        type: input.type,
        status: input.status,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        businessId: input.businessId,
      }
      await createMutation.mutateAsync(createInput)
    }
  }

  const setFiltersAndResetPage = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPageIndex(0)
  }

  return {
    rows,
    meta: listQuery.data?.meta,
    stats: listQuery.data?.stats,
    isInitialLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
    searchQuery,
    typeFilter,
    statusFilter,
    issuedFrom,
    issuedTo,
    expiresFrom,
    expiresTo,
    setSearchQuery: (value: string) => setFiltersAndResetPage(setSearchQuery, value),
    setTypeFilter: (value: FilterType) => {
      setTypeFilter(value)
      setPageIndex(0)
    },
    setStatusFilter: (value: FilterStatus) => {
      setStatusFilter(value)
      setPageIndex(0)
    },
    setIssuedFrom: (value: string) => setFiltersAndResetPage(setIssuedFrom, value),
    setIssuedTo: (value: string) => setFiltersAndResetPage(setIssuedTo, value),
    setExpiresFrom: (value: string) => setFiltersAndResetPage(setExpiresFrom, value),
    setExpiresTo: (value: string) => setFiltersAndResetPage(setExpiresTo, value),
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    selectedLicense,
    isDetailOpen: Boolean(detailSelection.id),
    detailLoading: detailQuery.isLoading,
    openDetailDrawer,
    closeDetailDrawer,
    openCreateModal,
    openEditModal,
    isFormOpen,
    closeFormModal,
    editingLicense,
    handleSubmit,
    isSaving: createMutation.isPending || updateMutation.isPending,
    requestDelete,
    confirmDialog,
    resetConfirmDialog,
    handleConfirmDelete,
    isDeleting: deleteMutation.isPending,
    handleSuspend,
    handleRevoke,
    handleAssign,
    isUpdatingStatus: suspendMutation.isPending || revokeMutation.isPending,
  }
}
