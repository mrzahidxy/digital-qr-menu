import http from 'http';
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

import app from './app';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { cache } from './utils/cache';

const execFileAsync = promisify(execFile);

const resolvePrismaCli = () =>
  path.resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

const applyMigrations = async () => {
  const prismaCli = resolvePrismaCli();

  logger.info(
    { event: 'startup', service: 'prisma', action: 'migrate_deploy' },
    'Applying Prisma migrations'
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (stdout.trim()) {
    logger.info(
      { event: 'external_service', service: 'prisma', stdout: stdout.trim() },
      'Prisma migrate deploy output'
    );
  }

  if (stderr.trim()) {
    logger.warn(
      { event: 'external_service', service: 'prisma', stderr: stderr.trim() },
      'Prisma migrate deploy warnings'
    );
  }
};

async function startServer(): Promise<void> {
  if (env.RUN_MIGRATIONS_ON_STARTUP) {
    await applyMigrations();
  } else {
    logger.info(
      { event: 'startup', service: 'prisma', action: 'migrations_skipped' },
      'Skipping Prisma migrations'
    );
  }

  const server = http.createServer(app);

  // Initialize cache
  cache.connect();

  server.listen(env.PORT, env.HOST, () => {
    logger.info(
      { event: 'startup', host: env.HOST, port: env.PORT, url: `http://${env.HOST}:${env.PORT}` },
      'Server listening'
    );
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ event: 'shutdown', signal }, 'Graceful shutdown started');
    server.close();

    try {
      await prisma.$disconnect();
      await cache.disconnect();
    } catch (error) {
      logger.error({ event: 'shutdown', error }, 'Error while disconnecting services');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((error) => {
  logger.error({ event: 'startup', error }, 'Fatal error during server startup');
  process.exit(1);
});
