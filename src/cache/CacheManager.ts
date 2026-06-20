import NodeCache from 'node-cache';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bigid-cache-manager' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      stderrLevels: ['error', 'warn', 'info', 'debug'], // Redirect all logs to stderr
    }),
  ],
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkperiod?: number; // How often to check for expired keys
  useClones?: boolean; // Whether to clone objects before storing
  deleteOnExpire?: boolean; // Whether to delete expired keys
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private cache: NodeCache;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 300; // 5 minutes default
    this.cache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: options.checkperiod || 60,
      useClones: options.useClones || false,
      deleteOnExpire: options.deleteOnExpire || true,
    });

    // Set up event listeners
    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.info('Cache flushed');
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        logger.debug(`Cache hit: ${key}`);
      } else {
        logger.debug(`Cache miss: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || this.defaultTTL);
      if (success) {
        logger.debug(`Cache set: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
      }
      return success;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        logger.debug(`Cache deleted: ${key}`);
      }
      return deleted > 0;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Flush all cache entries
   */
  flush(): void {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.keys().length;
  }

  /**
   * Cache entity types with longer TTL
   */
  cacheEntityTypes<T>(data: T): boolean {
    return this.set('entity_types', data, 3600); // 1 hour
  }

  /**
   * Get cached entity types
   */
  getCachedEntityTypes<T>(): T | undefined {
    return this.get<T>('entity_types');
  }

  /**
   * Cache search results with shorter TTL
   */
  cacheSearchResults<T>(query: string, data: T): boolean {
    const key = `search:${this.hashQuery(query)}`;
    return this.set(key, data, 300); // 5 minutes
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults<T>(query: string): T | undefined {
    const key = `search:${this.hashQuery(query)}`;
    return this.get<T>(key);
  }

  /**
   * Cache inventory aggregations
   */
  cacheInventoryAggregations<T>(params: any, data: T): boolean {
    const key = `inventory:${this.hashQuery(JSON.stringify(params))}`;
    return this.set(key, data, 600); // 10 minutes
  }

  /**
   * Get cached inventory aggregations
   */
  getCachedInventoryAggregations<T>(params: any): T | undefined {
    const key = `inventory:${this.hashQuery(JSON.stringify(params))}`;
    return this.get<T>(key);
  }

  /**
   * Cache authentication token
   */
  cacheAuthToken(token: string): boolean {
    return this.set('auth_token', token, 3600); // 1 hour
  }

  /**
   * Get cached authentication token
   */
  getCachedAuthToken(): string | undefined {
    return this.get<string>('auth_token');
  }

  /**
   * Clear authentication cache
   */
  clearAuthCache(): void {
    this.delete('auth_token');
  }

  /**
   * Clear search cache
   */
  clearSearchCache(): void {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith('search:')) {
        this.delete(key);
      }
    });
    logger.info('Search cache cleared');
  }

  /**
   * Clear inventory cache
   */
  clearInventoryCache(): void {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith('inventory:')) {
        this.delete(key);
      }
    });
    logger.info('Inventory cache cleared');
  }

  /**
   * Clear all caches except auth
   */
  clearAllCaches(): void {
    this.clearSearchCache();
    this.clearInventoryCache();
    this.delete('entity_types');
    logger.info('All caches cleared');
  }

  /**
   * Clear all caches for a specific domain
   */
  clearDomainCaches(domain: string): void {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith(`${domain}_`)) {
        this.delete(key);
      }
    });
    logger.info(`All caches cleared for domain: ${domain}`);
  }

  /**
   * Simple hash function for query strings
   */
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create a domain-aware cache key
   */
  createDomainKey(domain: string, baseKey: string): string {
    return `${domain}_${baseKey}`;
  }

  /**
   * Get cache memory usage (approximate)
   */
  getMemoryUsage(): number {
    const stats = this.getStats();
    return stats.vsize || 0;
  }

  /**
   * Set cache options
   */
  setOptions(options: CacheOptions): void {
    this.cache.close();
    this.cache = new NodeCache({
      stdTTL: options.ttl || this.defaultTTL,
      checkperiod: options.checkperiod || 60,
      useClones: options.useClones || false,
      deleteOnExpire: options.deleteOnExpire || true,
    });
  }
} 