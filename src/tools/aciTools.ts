import { ACIClient } from '../client/ACIClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

export class ACITools {
  private aciClient: ACIClient;
  private cache: CacheManager;

  constructor(aciClient: ACIClient, cache: CacheManager) {
    this.aciClient = aciClient;
    this.cache = cache;
  }

  /**
   * Validate and clean sort parameter
   */
  private validateSortParameter(sort?: string): string | undefined {
    if (!sort || sort.trim() === '') {
      return undefined;
    }
    
    // Handle URL-encoded JSON sort parameters
    try {
      // If it looks like URL-encoded JSON, decode it
      if (sort.includes('%')) {
        const decoded = decodeURIComponent(sort);
        // Validate it's valid JSON
        JSON.parse(decoded);
        return decoded;
      }
      
      // If it's already JSON, validate it
      if (sort.startsWith('[') || sort.startsWith('{')) {
        JSON.parse(sort);
        return sort;
      }
      
      // If it's a simple string, return as is
      return sort;
    } catch (error) {
      console.warn('Invalid sort parameter:', sort, 'using default sorting');
      return undefined;
    }
  }

  /**
   * Clean empty parameters
   */
  private cleanParameters(params: any): any {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Get data manager items with optional filtering and pagination
   */
  async getDataManager(params: {
    requireTotalCount?: boolean;
    limit?: number;
    sort?: string;
    grouping?: string;
    app_id?: string;
    skip?: number;
  } = {}) {
    // Set defaults and clean parameters
    const finalParams = this.cleanParameters({
      requireTotalCount: true,
      skip: 0,
      limit: 10,
      ...params
    });
    
    // Validate sort parameter
    if (finalParams.sort) {
      finalParams.sort = this.validateSortParameter(finalParams.sort);
    }
    
    const cacheKey = this.cache.createDomainKey(this.aciClient.getDomain(), `aci_data_manager_${JSON.stringify(finalParams)}`);
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.aciClient.getDataManager(finalParams);
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      console.error('ACI getDataManager error:', error);
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_aci_data_manager');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get permissions for a specific data manager item
   */
  async getDataManagerPermissions(params: {
    itemPath: string;
    skip?: number;
    limit?: number;
    requireTotalCount?: boolean;
  }) {
    // Validate required parameter
    if (!params.itemPath) {
      return { 
        success: false, 
        error: 'itemPath parameter is required for get_aci_data_manager_permissions' 
      };
    }
    
    // Set defaults and clean parameters
    const finalParams = this.cleanParameters({
      requireTotalCount: true,
      skip: 0,
      limit: 10,
      ...params
    });
    
    const cacheKey = `aci_data_manager_permissions_${params.itemPath}_${JSON.stringify(finalParams)}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { itemPath, ...queryParams } = finalParams;
      const result = await this.aciClient.getDataManagerPermissions(itemPath, queryParams);
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_aci_data_manager_permissions');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get groups with optional filtering and pagination
   */
  async getGroups(params: {
    skip?: number;
    limit?: number;
    requireTotalCount?: boolean;
    sort?: string;
  } = {}) {
    // Set defaults and clean parameters
    const finalParams = this.cleanParameters({
      requireTotalCount: true,
      skip: 0,
      limit: 10,
      ...params
    });
    
    // Validate sort parameter
    if (finalParams.sort) {
      finalParams.sort = this.validateSortParameter(finalParams.sort);
    }
    
    const cacheKey = `aci_groups_${JSON.stringify(finalParams)}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.aciClient.getGroups(finalParams);
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_aci_groups');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get users with optional filtering and pagination
   */
  async getUsers(params: {
    skip?: number;
    limit?: number;
    requireTotalCount?: boolean;
    sort?: string;
  } = {}) {
    // Set defaults and clean parameters
    const finalParams = this.cleanParameters({
      requireTotalCount: true,
      skip: 0,
      limit: 10,
      ...params
    });
    
    // Validate sort parameter
    if (finalParams.sort) {
      finalParams.sort = this.validateSortParameter(finalParams.sort);
    }
    
    const cacheKey = `aci_users_${JSON.stringify(finalParams)}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.aciClient.getUsers(finalParams);
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_aci_users');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 