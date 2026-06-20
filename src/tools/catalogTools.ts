import { DataCatalogClient } from '../client/DataCatalogClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

// Simple interfaces for tool arguments


interface GetCatalogObjectsPostArgs {
  filter?: string;
  skip?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  offsetKey?: string;
  ignoreLimit?: boolean;
  sample?: number;
  requireTotalCount?: boolean;
  respectHiddenTags?: string;
  getColumnOrFieldOccurrencesCounterFlag?: boolean;
  getNumIdentitiesFlag?: boolean;
}

interface GetObjectDetailsArgs {
  fullyQualifiedName: string;
}

interface GetTagsArgs {
  // No arguments needed
}

interface CreateTagArgs {
  name: string;
  description?: string;
  color?: string;
  category?: string;
}

interface UpdateTagArgs {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  category?: string;
}

interface DeleteTagArgs {
  id: string;
}

interface GetRulesArgs {
  // No arguments needed
}

interface CreateRuleArgs {
  name: string;
  description?: string;
  type: string;
  conditions: any[];
  actions: any[];
  enabled?: boolean;
}

interface UpdateRuleArgs {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  conditions?: any[];
  actions?: any[];
  enabled?: boolean;
}

interface DeleteRuleArgs {
  id: string;
}

interface GetRelationsArgs {
  fullyQualifiedName: string;
}

interface ExportCatalogArgs {
  format: string;
  filter?: string;
}

interface GetCatalogCountArgs {
  filter?: string;
}

interface GetObjectSummaryArgs {
  // No arguments needed
}

interface GetCatalogHealthArgs {
  // No arguments needed
}

interface GetDistinctValuesArgs {
  fieldName: string;
  filter?: string;
  limit?: number;
}

export class CatalogTools {
  private catalogClient: DataCatalogClient;
  private cache: CacheManager;

  constructor(catalogClient: DataCatalogClient, cache: CacheManager) {
    this.catalogClient = catalogClient;
    this.cache = cache;
  }



  /**
   * Get catalog objects using POST request with body parameters
   */
  async getCatalogObjectsPost(args: GetCatalogObjectsPostArgs): Promise<any> {
    try {
      const cacheKey = `catalog_objects_post_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getObjectsPost({
        filter: args.filter,
        skip: args.skip,
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
        offsetKey: args.offsetKey,
        ignoreLimit: args.ignoreLimit,
        sample: args.sample,
        requireTotalCount: args.requireTotalCount,
        respectHiddenTags: args.respectHiddenTags,
        getColumnOrFieldOccurrencesCounterFlag: args.getColumnOrFieldOccurrencesCounterFlag,
        getNumIdentitiesFlag: args.getNumIdentitiesFlag
      });
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_catalog_objects_post');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get detailed information about a specific object
   */
  async getObjectDetails(args: GetObjectDetailsArgs): Promise<any> {
    try {
      const cacheKey = `object_details_${args.fullyQualifiedName}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getObjectDetails(args.fullyQualifiedName);
      
      await this.cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_object_details');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get all tags
   */
  async getTags(args: GetTagsArgs): Promise<any> {
    try {
      const cacheKey = 'catalog_tags';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getTags();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_tags');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Create a new tag
   */
  async createTag(args: CreateTagArgs): Promise<any> {
    try {
      const result = await this.catalogClient.createTag({
        name: args.name,
        description: args.description,
        color: args.color,
        category: args.category
      });

      // Invalidate tags cache
      await this.cache.delete('catalog_tags');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'create_tag');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(args: UpdateTagArgs): Promise<any> {
    try {
      const result = await this.catalogClient.updateTag(args.id, {
        name: args.name,
        description: args.description,
        color: args.color,
        category: args.category
      });

      // Invalidate tags cache
      await this.cache.delete('catalog_tags');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'update_tag');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(args: DeleteTagArgs): Promise<any> {
    try {
      await this.catalogClient.deleteTag(args.id);

      // Invalidate tags cache
      await this.cache.delete('catalog_tags');
      
      return { success: true, message: `Tag ${args.id} deleted successfully` };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'delete_tag');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get all rules
   */
  async getRules(args: GetRulesArgs): Promise<any> {
    try {
      const cacheKey = 'catalog_rules';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getRules();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_rules');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Create a new rule
   */
  async createRule(args: CreateRuleArgs): Promise<any> {
    try {
      const result = await this.catalogClient.createRule({
        name: args.name,
        description: args.description,
        type: args.type,
        conditions: args.conditions,
        actions: args.actions,
        enabled: args.enabled !== false
      });

      // Invalidate rules cache
      await this.cache.delete('catalog_rules');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'create_rule');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(args: UpdateRuleArgs): Promise<any> {
    try {
      const result = await this.catalogClient.updateRule(args.id, {
        name: args.name,
        description: args.description,
        type: args.type,
        conditions: args.conditions,
        actions: args.actions,
        enabled: args.enabled
      });

      // Invalidate rules cache
      await this.cache.delete('catalog_rules');
      
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'update_rule');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(args: DeleteRuleArgs): Promise<any> {
    try {
      await this.catalogClient.deleteRule(args.id);

      // Invalidate rules cache
      await this.cache.delete('catalog_rules');
      
      return { success: true, message: `Rule ${args.id} deleted successfully` };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'delete_rule');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get data relationships for an object
   */
  async getRelations(args: GetRelationsArgs): Promise<any> {
    try {
      const cacheKey = `relations_${args.fullyQualifiedName}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getRelations(args.fullyQualifiedName);
      
      await this.cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_relations');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Export catalog data
   */
  async exportCatalog(args: ExportCatalogArgs): Promise<any> {
    try {
      const result = await this.catalogClient.exportCatalog(args.format, args.filter);
      
      return { 
        success: true, 
        data: {
          format: args.format,
          size: result.length,
          data: result.toString('base64') // Return as base64 for transport
        }
      };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'export_catalog');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get catalog count
   */
  async getCatalogCount(args: GetCatalogCountArgs): Promise<any> {
    try {
      const cacheKey = `catalog_count_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getCount({
        filter: args.filter
      });
      
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_catalog_count');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get object summary
   */
  async getObjectSummary(args: GetObjectSummaryArgs): Promise<any> {
    try {
      const cacheKey = 'object_summary';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getObjectSummary();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_object_summary');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get catalog health status
   */
  async getCatalogHealth(args: GetCatalogHealthArgs): Promise<any> {
    try {
      const result = await this.catalogClient.getHealth();
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_catalog_health');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get distinct values for a field
   */
  async getDistinctValues(args: GetDistinctValuesArgs): Promise<any> {
    try {
      const cacheKey = `distinct_values_${args.fieldName}_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.catalogClient.getDistinctValues(args.fieldName, {
        fieldName: args.fieldName,
        filter: args.filter,
        limit: args.limit
      });
      
      await this.cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_distinct_values');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }






} 