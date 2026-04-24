const baseKey = ['admin-overview'] as const

export const adminOverviewKeys = {
  all: baseKey,
  overview: () => [...baseKey, 'overview'] as const,
}
