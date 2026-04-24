import type { BusinessListFilters } from './restaurant-client'

const baseKey = ['businesses'] as const

export const businessKeys = {
  all: baseKey,
  list: (filters: Partial<BusinessListFilters>) => [...baseKey, filters] as const,
  detail: (id: string) => [...baseKey, 'detail', id] as const,
}
