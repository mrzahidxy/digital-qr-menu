import { PrismaClient } from '@prisma/client';

import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: env.PRISMA_QUERY_LOG ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
