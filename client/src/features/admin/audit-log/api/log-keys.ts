import type { LogListFilters } from './log-client'

const baseKey = ['admin-logs'] as const

export const logKeys = {
  all: baseKey,
  list: (filters: Partial<LogListFilters>) => [...baseKey, 'list', filters] as const,
  detail: (id: string) => [...baseKey, 'detail', id] as const,
  levels: () => [...baseKey, 'levels'] as const,
  categories: () => [...baseKey, 'categories'] as const,
}
