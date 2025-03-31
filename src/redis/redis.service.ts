import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;
  private keyPrefix: string = '';

  constructor(private configService: ConfigService) {
    this.keyPrefix = this.configService.get('REDIS_KEY_PREFIX', '');
  }

  async onModuleInit() {
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = this.configService.get('REDIS_PORT', 6379);
    const db = this.configService.get('REDIS_DB', 0);
    
    this.redisClient = createClient({
      url: `redis://${host}:${port}/${db}`,
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    await this.redisClient.connect();
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }

  private getFullKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }

  async set(key: string, value: string, ttl?: number): Promise<string | null> {
    const fullKey = this.getFullKey(key);
    if (ttl) {
      return this.redisClient.set(fullKey, value, { EX: ttl });
    }
    return this.redisClient.set(fullKey, value);
  }

  async get(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);
    return this.redisClient.get(fullKey);
  }

  async del(key: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    return this.redisClient.del(fullKey);
  }
} 