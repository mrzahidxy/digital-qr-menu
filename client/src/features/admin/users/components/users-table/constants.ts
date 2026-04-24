import type { AdminUserRole } from '../../api/user-client'

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Super Admin',
  OWNER: 'Owner',
  STAFF: 'Staff',
}

export const ROLE_FILTER_OPTIONS: { value: 'All' | AdminUserRole; label: string }[] = [
  { value: 'All', label: 'All roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'STAFF', label: 'Staff' },
]

export const ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'STAFF', label: 'Staff' },
]

export const ROLE_VARIANTS: Record<AdminUserRole, 'default' | 'outline'> = {
  SUPER_ADMIN: 'default',
  OWNER: 'outline',
  STAFF: 'outline',
}
