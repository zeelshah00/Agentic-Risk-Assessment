import { WidgetClient } from '../client/WidgetClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PagingHelper } from '../utils/PagingHelper';



export class WidgetTools {
  private widgetClient: WidgetClient;
  private cache: CacheManager;

  constructor(widgetClient: WidgetClient, cache: CacheManager) {
    this.widgetClient = widgetClient;
    this.cache = cache;
  }



  /**
   * Consolidated dashboard widget method
   * Handles all dashboard widget types through a single interface
   */
  async getDashboardWidget(args: {
    widgetType: 'group_by_framework' | 'group_by_control' | 'group_by_policy' | 'group_by_data_source_type';
    paging?: {
      limit: number;
      skip: number;
    };
  }): Promise<any> {
    try {
      const cacheKey = `dashboard_widget_${args.widgetType}_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const paging = PagingHelper.createPagingOptional(args, 0, 5);
      const result = await this.widgetClient.getDashboardWidget({
        widgetType: args.widgetType,
        ...(paging && { paging })
      });
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { 
        success: true, 
        data: result,
        widgetType: args.widgetType
      };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, `get_dashboard_widget_${args.widgetType}`);
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 