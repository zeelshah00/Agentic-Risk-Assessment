import { MetadataSearchClient } from '../client/MetadataSearchClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { DateTimeHelper } from '../utils/DateTimeHelper';
import { QuickSearchRequest, FullSearchRequest, DataExplorerRequest, DataExplorerObjectsBaseRequest } from '../types/metadataSearchTypes';

export class MetadataSearchTools {
  private metadataSearchClient: MetadataSearchClient;
  private cache: CacheManager;

  constructor(metadataSearchClient: MetadataSearchClient, cache: CacheManager) {
    this.metadataSearchClient = metadataSearchClient;
    this.cache = cache;
  }

  async quickSearch(args: QuickSearchRequest): Promise<any> {
    try {
      // Process datetime values in filters
      const processedArgs = DateTimeHelper.processMetadataSearchRequest(args);
      
      const cacheKey = `metadata_quick_search_${JSON.stringify(processedArgs)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.metadataSearchClient.quickSearch(processedArgs);
      await this.cache.set(cacheKey, result, 300);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: ErrorHandler.handleApiError(error as Error, 'quickSearch') };
    }
  }

  async fullSearch(args: FullSearchRequest): Promise<any> {
    try {
      // Process datetime values in filters
      const processedArgs = DateTimeHelper.processMetadataSearchRequest(args);
      
      const cacheKey = `metadata_full_search_${JSON.stringify(processedArgs)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.metadataSearchClient.fullSearch(processedArgs);
      await this.cache.set(cacheKey, result, 300);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: ErrorHandler.handleApiError(error as Error, 'fullSearch') };
    }
  }

  async objectsSearch(args: { entityType?: string } & DataExplorerRequest): Promise<any> {
    try {
      // Process datetime values in filters
      const processedArgs = DateTimeHelper.processMetadataSearchRequest(args);
      
      const cacheKey = `metadata_objects_search_${JSON.stringify(processedArgs)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { entityType, ...params } = processedArgs;
      const result = await this.metadataSearchClient.objectsSearch(entityType || null, params);
      await this.cache.set(cacheKey, result, 300);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: ErrorHandler.handleApiError(error as Error, 'objectsSearch') };
    }
  }

  async objectsCount(args: { entityType?: string } & DataExplorerObjectsBaseRequest): Promise<any> {
    try {
      // Process datetime values in filters
      const processedArgs = DateTimeHelper.processMetadataSearchRequest(args);
      
      const cacheKey = `metadata_objects_count_${JSON.stringify(processedArgs)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { entityType, ...params } = processedArgs;
      const result = await this.metadataSearchClient.objectsCount(entityType || null, params);
      await this.cache.set(cacheKey, result, 300);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: ErrorHandler.handleApiError(error as Error, 'objectsCount') };
    }
  }
} 