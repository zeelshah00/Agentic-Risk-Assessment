import { InventoryClient } from '../client/InventoryClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PagingHelper } from '../utils/PagingHelper';



export class InventoryTools {
  private inventoryClient: InventoryClient;
  private cache: CacheManager;

  constructor(inventoryClient: InventoryClient, cache: CacheManager) {
    this.inventoryClient = inventoryClient;
    this.cache = cache;
  }



  /**
   * Consolidated inventory aggregation method
   * Handles all inventory aggregation types through a single interface
   */
  async getInventoryAggregation(args: {
    aggregationType: 'tags' | 'sensitivityFilter' | 'source' | 'source.type' | 'attribute' | 'categoryExtended' | 'dataFormat' | 'duplicateFiles' | 'objectStatus';
    sorting?: Array<{
      field: string;
      order: 'ASC' | 'DESC';
    }>;
    paging?: {
      limit: number;
      skip: number;
    };
  }): Promise<any> {
    try {
      const cacheKey = `inventory_aggregation_${args.aggregationType}_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const paging = PagingHelper.createPagingOptional(args, 0, 1000);
      const result = await this.inventoryClient.getInventoryAggregation({
        aggregationType: args.aggregationType,
        sorting: args.sorting || [{ field: 'docCount', order: 'DESC' }],
        ...(paging && { paging })
      });
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { 
        success: true, 
        data: result,
        aggregationType: args.aggregationType
      };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, `get_inventory_aggregation_${args.aggregationType}`);
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 