import type { ResourceFilters } from '@/types/order'

const baseKey = ['orders'] as const

export const orderKeys = {
  all: baseKey,
  list: (filters: Partial<ResourceFilters>) => [...baseKey, filters] as const,
  detail: (id: string | number) => [...baseKey, 'detail', id] as const,
}
