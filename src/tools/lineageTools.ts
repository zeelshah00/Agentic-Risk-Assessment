import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { LineageClient } from '../client/LineageClient';

export class LineageTools {
  private lineageClient: LineageClient;
  private cache: CacheManager;

  constructor(lineageClient: LineageClient, cache: CacheManager) {
    this.lineageClient = lineageClient;
    this.cache = cache;
  }

  /**
   * Get lineage tree with multiple anchor collections to establish relationships
   * This tool provides syntax and guidelines for constructing nested/chained queries
   */
  async getLineageTree(args: {
    anchorCollections: string[];
    anchorAttributeType?: string;
  }): Promise<any> {
    try {
      const cacheKey = `lineage_tree_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.lineageClient.getLineageTree(args);

      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { 
        success: true, 
        data: result
      };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_lineage_tree');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 