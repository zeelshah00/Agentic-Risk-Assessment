import { DataCategoriesClient } from '../client/DataCategoriesClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

// Simple interfaces for tool arguments
interface GetDataCategoriesArgs {
  // No arguments needed
}

interface CreateDataCategoryArgs {
  unique_name: string;
  description?: string;
  display_name?: string;
  color?: string;
}

export class DataCategoriesTools {
  private dataCategoriesClient: DataCategoriesClient;
  private cache: CacheManager;

  constructor(dataCategoriesClient: DataCategoriesClient, cache: CacheManager) {
    this.dataCategoriesClient = dataCategoriesClient;
    this.cache = cache;
  }

  /**
   * Get all data categories
   */
  async getDataCategories(args: GetDataCategoriesArgs): Promise<any> {
    try {
      const cacheKey = 'data_categories';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.dataCategoriesClient.getDataCategories();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_data_categories');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Create a new data category
   */
  async createDataCategory(args: CreateDataCategoryArgs): Promise<any> {
    try {
      const result = await this.dataCategoriesClient.createDataCategory({
        unique_name: args.unique_name,
        description: args.description,
        display_name: args.display_name,
        color: args.color
      });
      
      // Invalidate cache since we added a new category
      await this.cache.delete('data_categories');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'create_data_category');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 