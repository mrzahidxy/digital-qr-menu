import { UserRole } from '@prisma/client';

export const PERMISSION_KEYS = [
  // Business permissions
  'BUSINESS_READ_OWN',
  'BUSINESS_UPDATE_OWN',
  'BUSINESS_MANAGE_MENU',
  'BUSINESS_MANAGE_STAFF',
  
  // Menu permissions
  'MENU_CREATE',
  'MENU_READ',
  'MENU_UPDATE',
  'MENU_DELETE',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export const PERMISSIONS: Record<PermissionKey, { label: string; description: string }> = {
  BUSINESS_READ_OWN: {
    label: 'Read own business',
    description: 'Allow reading own business information'
  },
  BUSINESS_UPDATE_OWN: {
    label: 'Update own business',
    description: 'Allow updating own business information'
  },
  BUSINESS_MANAGE_MENU: {
    label: 'Manage business menu',
    description: 'Allow managing business menu items'
  },
  BUSINESS_MANAGE_STAFF: {
    label: 'Manage business staff',
    description: 'Allow managing business staff members'
  },
  MENU_CREATE: {
    label: 'Create menu',
    description: 'Allow creating new menus'
  },
  MENU_READ: {
    label: 'Read menu',
    description: 'Allow reading menus'
  },
  MENU_UPDATE: {
    label: 'Update menu',
    description: 'Allow updating menus'
  },
  MENU_DELETE: {
    label: 'Delete menu',
    description: 'Allow deleting menus'
  },
};

export const ROLE_PRESETS: Record<UserRole, PermissionKey[]> = {
  [UserRole.SUPER_ADMIN]: Object.keys(PERMISSIONS) as PermissionKey[],
  [UserRole.OWNER]: Object.keys(PERMISSIONS) as PermissionKey[],
  [UserRole.STAFF]: ['BUSINESS_READ_OWN', 'MENU_READ'],
};

export const ROLE_METADATA: Record<UserRole, { label: string; description: string }> = {
  [UserRole.SUPER_ADMIN]: {
    label: 'Super Admin',
    description: 'Platform-wide control',
  },
  [UserRole.OWNER]: {
    label: 'Owner',
    description: 'Full control of a business',
  },
  [UserRole.STAFF]: {
    label: 'Staff',
    description: 'Limited access to business profile',
  },
};

export const permissionsForRole = (role: UserRole): PermissionKey[] => {
  return ROLE_PRESETS[role] || [];
};

export const resolvePermissions = (
  role: UserRole,
  _assignedPermissions?: PermissionKey[]
): PermissionKey[] => {
  // Since the User model no longer has a permissions column, 
  // we rely solely on role-based presets
  return permissionsForRole(role);
};

export const rbacDefinitions = {
  roles: Object.keys(ROLE_PRESETS),
  permissions: PERMISSION_KEYS,
};
