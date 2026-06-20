import { SensitivityClassificationClient } from '../client/SensitivityClassificationClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

// Simple interfaces for tool arguments
interface GetScConfigsArgs {
  skip?: number;
  limit?: number;
  sort?: string;
  filter?: string;
  requireTotalCount?: boolean;
}

interface CreateScConfigArgs {
  name: string;
  description?: string;
  levels: Array<{
    name: string;
    description?: string;
    color?: string;
    priority: number;
    enabled?: boolean;
  }>;
  enabled?: boolean;
}

interface UpdateScConfigArgs {
  id: string;
  name?: string;
  description?: string;
  levels?: Array<{
    id?: string;
    name: string;
    description?: string;
    color?: string;
    priority: number;
    enabled?: boolean;
  }>;
  enabled?: boolean;
}

interface GetScConfigByIdArgs {
  id: string;
}

interface DeleteScConfigArgs {
  id: string;
}

interface GetClassificationRatioByNameArgs {
  name: string;
}

interface GetClassificationRatioByIdArgs {
  id: string;
}

export class SensitivityClassificationTools {
  private scClient: SensitivityClassificationClient;
  private cache: CacheManager;

  constructor(scClient: SensitivityClassificationClient, cache: CacheManager) {
    this.scClient = scClient;
    this.cache = cache;
  }

  /**
   * Get active sensitivity groups
   */
  async getScConfigs(args: GetScConfigsArgs): Promise<any> {
    try {
      // Set defaults for required parameters
      const finalArgs = {
        skip: 0,
        limit: 1000,
        ...args
      };
      
      const cacheKey = `sc_configs_${JSON.stringify(finalArgs)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.scClient.getScConfigs({
        skip: finalArgs.skip,
        limit: finalArgs.limit,
        sort: finalArgs.sort,
        filter: finalArgs.filter,
        requireTotalCount: finalArgs.requireTotalCount
      });
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_sc_configs');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Create a new sensitivity group
   */
  async createScConfig(args: CreateScConfigArgs): Promise<any> {
    try {
      const result = await this.scClient.createScConfig({
        name: args.name,
        description: args.description,
        levels: args.levels,
        enabled: args.enabled
      });
      
      // Invalidate cache since we added a new config
      await this.cache.delete('sc_configs');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'create_sc_config');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Update an existing sensitivity group
   */
  async updateScConfig(args: UpdateScConfigArgs): Promise<any> {
    try {
      const result = await this.scClient.updateScConfig({
        id: args.id,
        name: args.name || '',
        description: args.description,
        levels: args.levels || [],
        enabled: args.enabled
      });
      
      // Invalidate cache since we updated a config
      await this.cache.delete('sc_configs');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'update_sc_config');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get sensitivity group by ID
   */
  async getScConfigById(args: GetScConfigByIdArgs): Promise<any> {
    try {
      const cacheKey = `sc_config_${args.id}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.scClient.getScConfigById(args.id);
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_sc_config_by_id');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Delete sensitivity group by ID
   */
  async deleteScConfig(args: DeleteScConfigArgs): Promise<any> {
    try {
      await this.scClient.deleteScConfig(args.id);
      
      // Invalidate cache since we deleted a config
      await this.cache.delete('sc_configs');
      await this.cache.delete(`sc_config_${args.id}`);
      
      return { success: true, data: { message: `Sensitivity configuration with ID ${args.id} deleted successfully` } };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'delete_sc_config');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get the ratio of classified to unclassified objects
   */
  async getTotalClassificationRatios(): Promise<any> {
    try {
      const cacheKey = 'total_classification_ratios';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.scClient.getTotalClassificationRatios();
      
      await this.cache.set(cacheKey, result, 900); // Cache for 15 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_total_classification_ratios');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get classification ratio by group name
   */
  async getClassificationRatioByName(args: GetClassificationRatioByNameArgs): Promise<any> {
    try {
      const cacheKey = `classification_ratio_name_${args.name}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.scClient.getClassificationRatioByName(args.name);
      
      await this.cache.set(cacheKey, result, 900); // Cache for 15 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_classification_ratio_by_name');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get classification ratio by group ID
   */
  async getClassificationRatioById(args: GetClassificationRatioByIdArgs): Promise<any> {
    try {
      const cacheKey = `classification_ratio_id_${args.id}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.scClient.getClassificationRatioById(args.id);
      
      await this.cache.set(cacheKey, result, 900); // Cache for 15 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_classification_ratio_by_id');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 