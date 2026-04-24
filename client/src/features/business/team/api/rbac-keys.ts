export const teamKeys = {
  all: ['business-team'] as const,
  members: (businessId: string) => ['business-team', 'members', businessId] as const,
}
