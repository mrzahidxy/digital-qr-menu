import { z } from 'zod';

export const LOG_LEVEL_VALUES = ['ERROR', 'WARN', 'INFO', 'DEBUG'] as const;

export type LogLevel = (typeof LOG_LEVEL_VALUES)[number];

export const logIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listLogsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  level: z.enum(LOG_LEVEL_VALUES).optional(),
  category: z.string().trim().min(1).optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['timestamp', 'level', 'category', 'createdAt']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const clearLogsQuerySchema = z.object({
  retentionDays: z.coerce.number().int().positive().max(3650).optional(),
});

export type LogIdParam = z.infer<typeof logIdParamSchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
export type ClearLogsQuery = z.infer<typeof clearLogsQuerySchema>;
