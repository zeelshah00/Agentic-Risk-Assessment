import { QuickSearchClient } from '../client/QuickSearchClient';
import { CacheManager } from '../cache/CacheManager';
import { QuickSearchRequest, QuickSearchResponse } from '../types/quickSearchTypes';

/**
 * MCP Tools for BigID Quick Search functionality
 * Provides quick search capabilities across multiple entity types
 */
export class QuickSearchTools {
  constructor(
    private client: QuickSearchClient,
    private cacheManager: CacheManager
  ) {}

  /**
   * Perform a quick search across multiple entity types
   * @param params Search parameters
   * @returns Search results with highlighting
   */
  async quickSearch(params: {
    searchText: string;
    entityTypes?: string[];
    topHits?: number;
    fieldsToProject?: string[];
    filter?: string;
  }): Promise<any> {
    try {
      // Validate input
      if (!params.searchText || params.searchText.trim().length < 3) {
        return {
          success: false,
          error: 'Search text must be at least 3 characters long',
        };
      }

      // Create cache key
      const cacheKey = `quick_search:${JSON.stringify(params)}`;
      
      // Check cache first
      const cachedResult = this.cacheManager.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          cached: true,
        };
      }

      // Prepare search request
      const searchRequest: QuickSearchRequest = {
        searchText: params.searchText.trim(),
        entityTypes: params.entityTypes || ['catalog', 'datasource', 'policy'],
        topHits: params.topHits,
        fieldsToProject: params.fieldsToProject,
        filter: params.filter,
      };

      // Perform search
      const result = await this.client.quickSearch(searchRequest);

      // Cache the result for 5 minutes
      this.cacheManager.set(cacheKey, result, 300);

      return {
        success: true,
        data: result,
        summary: this.generateSearchSummary(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quick search failed',
      };
    }
  }

  /**
   * Perform a simple quick search with default settings
   * @param params Simple search parameters
   * @returns Search results
   */
  async quickSearchSimple(params: {
    searchText: string;
    topHits?: number;
    filter?: string;
  }): Promise<any> {
    return this.quickSearch({
      searchText: params.searchText,
      topHits: params.topHits,
      filter: params.filter,
    });
  }

  /**
   * Search for specific entity types only
   * @param params Search parameters with specific entity types
   * @returns Search results for specified entity types
   */
  async quickSearchByEntityTypes(params: {
    searchText: string;
    entityTypes: string[];
    topHits?: number;
    fieldsToProject?: string[];
    filter?: string;
  }): Promise<any> {
    return this.quickSearch({
      searchText: params.searchText,
      entityTypes: params.entityTypes,
      topHits: params.topHits,
      fieldsToProject: params.fieldsToProject,
      filter: params.filter,
    });
  }

  /**
   * Search for catalog entities specifically
   * @param params Search parameters
   * @returns Catalog search results
   */
  async quickSearchCatalog(params: {
    searchText: string;
    topHits?: number;
    fieldsToProject?: string[];
    filter?: string;
  }): Promise<any> {
    return this.quickSearch({
      searchText: params.searchText,
      entityTypes: ['catalog'],
      topHits: params.topHits,
      fieldsToProject: params.fieldsToProject,
      filter: params.filter,
    });
  }

  /**
   * Search for datasource entities specifically
   * @param params Search parameters
   * @returns Datasource search results
   */
  async quickSearchDatasource(params: {
    searchText: string;
    topHits?: number;
    fieldsToProject?: string[];
    filter?: string;
  }): Promise<any> {
    return this.quickSearch({
      searchText: params.searchText,
      entityTypes: ['datasource'],
      topHits: params.topHits,
      fieldsToProject: params.fieldsToProject,
      filter: params.filter,
    });
  }

  /**
   * Search for policy entities specifically
   * @param params Search parameters
   * @returns Policy search results
   */
  async quickSearchPolicy(params: {
    searchText: string;
    topHits?: number;
    fieldsToProject?: string[];
    filter?: string;
  }): Promise<any> {
    return this.quickSearch({
      searchText: params.searchText,
      entityTypes: ['policy'],
      topHits: params.topHits,
      fieldsToProject: params.fieldsToProject,
      filter: params.filter,
    });
  }

  /**
   * Generate a summary of search results
   * @param result Quick search response
   * @returns Summary object
   */
  private generateSearchSummary(result: QuickSearchResponse): any {
    const summary: any = {
      totalEntityTypes: Object.keys(result.data).length,
      totalResults: 0,
      entityTypeBreakdown: {},
    };

    for (const [entityType, entityData] of Object.entries(result.data)) {
      summary.entityTypeBreakdown[entityType] = {
        count: entityData.count,
        hasResults: entityData.results.length > 0,
      };
      summary.totalResults += entityData.count;
    }

    return summary;
  }
} 