import { z } from 'zod';

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex value like #0F172A');

const urlSafeSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe and use lowercase letters, numbers, and hyphens');

const nullableUrlSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().url().optional()
);

export const businessIdParamSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
});

export const businessUserParamsSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  userId: z.string().uuid('User ID must be a valid UUID'),
});

export const createBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
});

export const listBusinessesQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const businessWorkspaceQuerySchema = z.object({
  recentOrdersLimit: z.coerce.number().int().min(1).max(100).optional().default(5),
  recentStaffLimit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export const assignBusinessUserSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  role: z.enum(['SUPER_ADMIN', 'OWNER', 'STAFF']),
});

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required'),
  slug: urlSafeSlugSchema,
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isDefault: z.boolean().default(false),
});

export const updateMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required').optional(),
  slug: urlSafeSlugSchema.optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  isDefault: z.boolean().optional(),
});

export const menuIdParamSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  menuId: z.string().uuid('Menu ID must be a valid UUID'),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const categoryParamsSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  menuId: z.string().uuid('Menu ID must be a valid UUID'),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  priceCents: z.coerce.number().int().nonnegative(),
  badge: z.enum(['VEGAN', 'SPICY', 'NONE']),
  photoUrl: nullableUrlSchema,
  isAvailable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').optional(),
  description: z.string().optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  badge: z.enum(['VEGAN', 'SPICY', 'NONE']).optional(),
  photoUrl: nullableUrlSchema,
  isAvailable: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const itemParamsSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  menuId: z.string().uuid('Menu ID must be a valid UUID'),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  itemId: z.string().uuid('Item ID must be a valid UUID'),
});

export const upsertQrSettingsSchema = z.object({
  publicSlug: z.string().optional(),
  includeLogo: z.boolean(),
  foregroundColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
});

export const updateBusinessBrandingSchema = z.object({
  description: z.string().optional(),
  logoUrl: nullableUrlSchema,
  coverImageUrl: nullableUrlSchema,
  primaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  fontFamily: z.string().optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type ListBusinessesQueryInput = z.infer<typeof listBusinessesQuerySchema>;
export type AssignBusinessUserInput = z.infer<typeof assignBusinessUserSchema>;
export type BusinessWorkspaceQueryInput = z.infer<typeof businessWorkspaceQuerySchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UpsertQrSettingsInput = z.infer<typeof upsertQrSettingsSchema>;
export type UpdateBusinessBrandingInput = z.infer<typeof updateBusinessBrandingSchema>;
