import { UserRole } from '@prisma/client';
import { User } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  roles: UserRole[];
  businessId?: string | null;
  permissions: string[]; // Added permissions property
}

// Define the sanitized user type
export type SanitizedUser = Pick<User, 'id' | 'email' | 'fullName' | 'role'> & {
  roles: UserRole[];
  businessId?: string | null;
  permissions: string[]; // Added permissions property
};

// Define the sanitizeUser function type
export type SanitizeUser = (user: User) => Omit<AuthenticatedUser, 'businessId'>;