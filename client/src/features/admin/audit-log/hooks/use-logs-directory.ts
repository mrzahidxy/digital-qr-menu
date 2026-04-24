'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { formatDate } from '@/lib/format'

import {
  clearOldLogs,
  fetchLogs,
  getLogById,
  getLogCategories,
  getLogLevels,
  type LogLevel,
  type LogListFilters,
  type AuditLog,
  type AuditCategory,
} from '../api/log-client'
import { logKeys } from '../api/log-keys'

type ClearDialogState = {
  isOpen: boolean
}

const defaultClearDialogState: ClearDialogState = {
  isOpen: false,
}

const CATEGORY_FILTERS: AuditCategory[] = ['AUTH', 'BUSINESS', 'MENU', 'ORDER', 'USER', 'LICENSE', 'SYSTEM']

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) return value
  }
  return fallback
}

function extractMetaText(meta: Record<string, unknown> | null, key: string) {
  const value = meta?.[key]
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function toLabel(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  return value
}

function mapLogRow(log: AuditLog) {
  const actor = log.user?.email ?? extractMetaText(log.meta, 'actor') ?? 'System'
  const entityType =
    extractMetaText(log.meta, 'entityType') ??
    extractMetaText(log.meta, 'entity') ??
    log.category
  const action =
    extractMetaText(log.meta, 'action') ??
    extractMetaText(log.meta, 'event') ??
    log.message.split(':')[0]?.trim() ??
    '—'
  const context =
    extractMetaText(log.meta, 'context') ??
    extractMetaText(log.meta, 'reason') ??
    extractMetaText(log.meta, 'details')

  return {
    ...log,
    timestampLabel: formatDate(log.timestamp),
    createdAtLabel: formatDate(log.createdAt),
    actorLabel: toLabel(actor, 'System'),
    entityTypeLabel: toLabel(entityType, '—'),
    actionLabel: toLabel(action, '—'),
    contextLabel: context ?? '—',
  }
}

export type LogDirectoryRow = ReturnType<typeof mapLogRow>

export function useLogsDirectory() {
  const queryClient = useQueryClient()
  const hasShownListError = useRef(false)
  const hasShownDetailError = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
  const [retentionDays, setRetentionDays] = useState(30)
  const [detailSelection, setDetailSelection] = useState<{ id: string | null; log: AuditLog | null }>({
    id: null,
    log: null,
  })
  const [clearDialog, setClearDialog] = useState<ClearDialogState>(defaultClearDialogState)

  const deferredSearch = useDeferredValue(searchQuery)

  const filters = useMemo<Partial<LogListFilters>>(() => {
    const query: Partial<LogListFilters> = {
      page: pageIndex + 1,
      limit: pageSize,
    }

    const trimmedSearch = deferredSearch.trim()
    if (trimmedSearch) query.search = trimmedSearch
    if (levelFilter !== 'all') query.level = levelFilter
    if (categoryFilter !== 'all') query.category = categoryFilter
    if (userIdFilter.trim()) query.actorId = userIdFilter.trim()
    if (dateFrom) query.dateFrom = dateFrom
    if (dateTo) query.dateTo = dateTo

    const activeSort = sorting[0]
    if (activeSort) {
      query.sortBy = activeSort.id as LogListFilters['sortBy']
      query.sortDirection = activeSort.desc ? 'desc' : 'asc'
    }

    return query
  }, [categoryFilter, dateFrom, dateTo, deferredSearch, levelFilter, pageIndex, pageSize, sorting, userIdFilter])

  const listQuery = useQuery({
    queryKey: logKeys.list(filters),
    queryFn: () => fetchLogs(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: detailSelection.id ? logKeys.detail(detailSelection.id) : logKeys.detail(''),
    queryFn: () => getLogById(detailSelection.id ?? ''),
    enabled: Boolean(detailSelection.id),
    staleTime: 30_000,
  })

  const levelsQuery = useQuery({
    queryKey: logKeys.levels(),
    queryFn: getLogLevels,
    staleTime: 5 * 60 * 1000,
  })

  const categoriesQuery = useQuery({
    queryKey: logKeys.categories(),
    queryFn: getLogCategories,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (listQuery.error && !hasShownListError.current) {
      toast.error('Failed to load logs')
      hasShownListError.current = true
    } else if (!listQuery.error && hasShownListError.current) {
      hasShownListError.current = false
    }
  }, [listQuery.error])

  useEffect(() => {
    if (detailQuery.error && !hasShownDetailError.current) {
      toast.error('Failed to load log details')
      hasShownDetailError.current = true
    } else if (!detailQuery.error && hasShownDetailError.current) {
      hasShownDetailError.current = false
    }
  }, [detailQuery.error])

  const clearMutation = useMutation({
    mutationFn: clearOldLogs,
    onSuccess: async (response) => {
      toast.success(response.message ?? 'Old logs cleared successfully')
      await queryClient.invalidateQueries({ queryKey: logKeys.all })
      setClearDialog(defaultClearDialogState)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to clear logs'))
    },
  })

  const rows = useMemo<LogDirectoryRow[]>(() => (listQuery.data?.data ?? []).map(mapLogRow), [
    listQuery.data?.data,
  ])

  const selectedLog = detailQuery.data ?? detailSelection.log
  const isInitialLoading = listQuery.isLoading && !listQuery.data

  const openDetailDrawer = (log: AuditLog) => {
    setDetailSelection({ id: log.id, log })
  }

  const closeDetailDrawer = () => {
    setDetailSelection({ id: null, log: null })
  }

  const openClearDialog = () => setClearDialog({ isOpen: true })
  const closeClearDialog = () => setClearDialog(defaultClearDialogState)

  const handleConfirmClear = async () => {
    if (clearMutation.isPending) return
    await clearMutation.mutateAsync(retentionDays)
  }

  const setFiltersAndResetPage = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPageIndex(0)
  }

  const levelOptions = useMemo(
    () =>
      (levelsQuery.data?.length
        ? (levelsQuery.data as LogLevel[])
        : (['ERROR', 'WARN', 'INFO', 'DEBUG'] as LogLevel[])),
    [levelsQuery.data]
  )
  const categoryOptions = useMemo(() => {
    const fromApi = new Set((categoriesQuery.data ?? []) as AuditCategory[])
    return CATEGORY_FILTERS.filter((category) => fromApi.has(category) || !categoriesQuery.data?.length)
  }, [categoriesQuery.data])

  return {
    rows,
    meta: listQuery.data?.meta,
    stats: listQuery.data?.stats,
    isInitialLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
    searchQuery,
    levelFilter,
    categoryFilter,
    userIdFilter,
    dateFrom,
    dateTo,
    retentionDays,
    setSearchQuery: (value: string) => setFiltersAndResetPage(setSearchQuery, value),
    setLevelFilter: (value: 'all' | LogLevel) => {
      setLevelFilter(value)
      setPageIndex(0)
    },
    setCategoryFilter: (value: 'all' | string) => {
      setCategoryFilter(value)
      setPageIndex(0)
    },
    setUserIdFilter: (value: string) => setFiltersAndResetPage(setUserIdFilter, value),
    setDateFrom: (value: string) => setFiltersAndResetPage(setDateFrom, value),
    setDateTo: (value: string) => setFiltersAndResetPage(setDateTo, value),
    setRetentionDays,
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    selectedLog,
    isDetailOpen: Boolean(detailSelection.id),
    detailLoading: detailQuery.isLoading,
    openDetailDrawer,
    closeDetailDrawer,
    levelOptions,
    categoryOptions,
    clearDialog,
    openClearDialog,
    closeClearDialog,
    handleConfirmClear,
    isClearing: clearMutation.isPending,
  }
}
