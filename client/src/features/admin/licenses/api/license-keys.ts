import type { LicenseListFilters } from './license-client'

const baseKey = ['admin-licenses'] as const

export const licenseKeys = {
  all: baseKey,
  list: (filters: Partial<LicenseListFilters>) => [...baseKey, 'list', filters] as const,
  detail: (id: string) => [...baseKey, 'detail', id] as const,
}
