import { BigIDClient } from '../client/BigIDClient';
import { QuickSearchRequest, FullSearchRequest, SearchFilter, Sort, Paging } from '../types/bigidTypes';

export interface SearchMetadataParams {
  text: string;
  filter?: SearchFilter[];
  top?: number;
}

export interface SearchMetadataFullParams {
  text: string;
  filter?: SearchFilter[];
  sort?: Sort[];
  paging?: {
    skip?: number;
    limit?: number;
  };
}

export class SearchTools {
  constructor(private client: BigIDClient) {}

  /**
   * Quick search across all entity types
   */
  async searchMetadata(params: SearchMetadataParams) {
    const request: QuickSearchRequest = {
      text: params.text,
      filter: params.filter || [],
      top: params.top || 10,
    };

    try {
      const response = await this.client.quickSearch(request);
      return {
        success: true,
        data: response,
        summary: {
          totalTypes: response.typeResults.length,
          totalResults: response.typeResults.reduce((sum, type) => sum + type.count, 0),
          types: response.typeResults.map(type => ({
            type: type.type,
            count: type.count,
            results: type.results.length,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Full search with advanced filtering and pagination
   */
  async searchMetadataFull(params: SearchMetadataFullParams) {
    const request: FullSearchRequest = {
      text: params.text,
      filter: params.filter || [],
      sort: params.sort || [],
      paging: {
        skip: params.paging?.skip || 0,
        limit: params.paging?.limit || 20,
      },
    };

    try {
      const response = await this.client.fullSearch(request);
      return {
        success: true,
        data: response,
        summary: {
          totalResults: response.results.length,
          results: response.results.map(result => ({
            id: result.id,
            type: result.type,
            primaryFields: result.primary.map(p => ({ name: p.name, value: p.value })),
            assets: result.assets.map(a => ({ name: a.name, value: a.value })),
            templateUrl: result.templateUrl,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Search with specific filters
   */
  async searchWithFilters(text: string, filters: SearchFilter[], top: number = 10) {
    return this.searchMetadata({
      text,
      filter: filters,
      top,
    });
  }

  /**
   * Search by entity type
   */
  async searchByEntityType(text: string, entityType: string, top: number = 10) {
    const filter: SearchFilter = {
      field: 'type',
      operator: 'equal',
      value: entityType,
      fieldType: 'STRING',
    };

    return this.searchMetadata({
      text,
      filter: [filter],
      top,
    });
  }

  /**
   * Search with date range
   */
  async searchWithDateRange(text: string, startDate: string, endDate: string, top: number = 10) {
    const filters: SearchFilter[] = [
      {
        field: 'updateDate',
        operator: 'greaterThanOrEqual',
        value: startDate,
        fieldType: 'DATE',
      },
      {
        field: 'updateDate',
        operator: 'lessThanOrEqual',
        value: endDate,
        fieldType: 'DATE',
      },
    ];

    return this.searchMetadata({
      text,
      filter: filters,
      top,
    });
  }

  /**
   * Search with multiple conditions
   */
  async searchWithMultipleConditions(
    text: string,
    conditions: Array<{ field: string; operator: string; value: any; fieldType: string }>,
    top: number = 10
  ) {
    const filters: SearchFilter[] = conditions.map(condition => ({
      field: condition.field,
      operator: condition.operator as any,
      value: condition.value,
      fieldType: condition.fieldType as any,
    }));

    return this.searchMetadata({
      text,
      filter: filters,
      top,
    });
  }
} 