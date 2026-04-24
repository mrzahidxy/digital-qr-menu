import Redis from 'ioredis';

import { env } from './env';
import { logger } from './logger';

class Cache {
  private client: Redis | null = null;
  private isConnected = false;
  private connectAttempted = false;

  connect() {
    if (!env.REDIS_URL) {
      logger.warn({ event: 'external_service', service: 'redis', enabled: false }, 'Redis URL not provided');
      return;
    }

    if (this.client || this.connectAttempted) {
      return;
    }

    this.connectAttempted = true;

    try {
      this.client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 5000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info({ event: 'external_service', service: 'redis', status: 'connected' }, 'Redis connected');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.warn(
          { event: 'external_service', service: 'redis', status: 'unavailable', error },
          'Redis unavailable'
        );
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      void this.client.connect().catch((error) => {
        this.isConnected = false;
        logger.warn(
          { event: 'external_service', service: 'redis', status: 'unavailable', error },
          'Redis unavailable'
        );

        this.client?.disconnect();
        this.client = null;
      });
    } catch (error) {
      logger.error({ event: 'external_service', service: 'redis', error }, 'Failed to initialize Redis');
      this.client = null;
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ event: 'external_service', service: 'redis', key, error }, 'Cache get error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error({ event: 'external_service', service: 'redis', key, error }, 'Cache set error');
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error({ event: 'external_service', service: 'redis', key, error }, 'Cache delete error');
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const keys: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const stream = this.client!.scanStream({
          match: `${prefix}*`,
          count: 100,
        });

        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        stream.on('end', () => resolve());
        stream.on('error', (error) => reject(error));
      });

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error({ event: 'external_service', service: 'redis', prefix, error }, 'Cache pattern delete error');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client.removeAllListeners();
      this.client = null;
    }

    this.isConnected = false;
  }

  isConnectedToRedis(): boolean {
    return this.isConnected;
  }
}

export const cache = new Cache();
