export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'STAFF'
  | 'USER'
  | 'GUEST'


export type AppUser = {
  id: string
  name: string
  email: string
  role: UserRole
  businessId?: string | null
  permissions?: string[]
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export type SafeUser = Omit<AppUser, 'passwordHash'>
