import { z } from 'zod';

export const LICENSE_PLAN_VALUES = ['MONTHLY', 'YEARLY', 'LIFETIME'] as const;
export const LICENSE_STATUS_VALUES = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;

export type LicensePlan = (typeof LICENSE_PLAN_VALUES)[number];
export type LicenseStatus = (typeof LICENSE_STATUS_VALUES)[number];

export const licenseIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listLicensesQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  plan: z.enum(LICENSE_PLAN_VALUES).optional(),
  status: z.enum(LICENSE_STATUS_VALUES).optional(),
  businessId: z.string().uuid().optional(),
  issuedFrom: z.coerce.date().optional(),
  issuedTo: z.coerce.date().optional(),
  expiresFrom: z.coerce.date().optional(),
  expiresTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sortBy: z
    .enum(['key', 'plan', 'status', 'issuedAt', 'expiresAt', 'createdAt', 'updatedAt'])
    .optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const createLicenseSchema = z
  .object({
    key: z.string().trim().min(4).optional(),
    plan: z.enum(LICENSE_PLAN_VALUES),
    status: z.enum(LICENSE_STATUS_VALUES).optional(),
    issuedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    businessId: z.string().uuid().optional(),
  })
  .refine((value) => value.businessId !== undefined, {
    message: 'businessId is required',
    path: ['businessId'],
  });

export const updateLicenseSchema = z
  .object({
    key: z.string().trim().min(4).optional(),
    plan: z.enum(LICENSE_PLAN_VALUES).optional(),
    status: z.enum(LICENSE_STATUS_VALUES).optional(),
    issuedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    businessId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.key !== undefined ||
      value.plan !== undefined ||
      value.status !== undefined ||
      value.issuedAt !== undefined ||
      value.expiresAt !== undefined ||
      value.businessId !== undefined,
    {
      message: 'At least one field must be provided',
    }
  );

export type LicenseIdParam = z.infer<typeof licenseIdParamSchema>;
export type ListLicensesQuery = z.infer<typeof listLicensesQuerySchema>;
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
