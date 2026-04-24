import type { AdminUserRole, AdminUser } from '../../api/user-client'

export type RoleFilterOption = 'All' | 'SUPER_ADMIN' | 'OWNER' | 'STAFF'

export type DialogAction = 'delete'

export type DirectoryUser = {
  id: string
  email: string
  name: string
  roleLabel: string
  roleValue: AdminUserRole
  createdDate: string
  updatedDate: string
  raw: AdminUser
}

export type CreateUserFormValues = {
  name: string
  email: string
  password: string
  role: AdminUserRole
}
