import { BigIDClient } from '../client/BigIDClient';
import { DataExplorerRequestDTO, DataExplorerQuickRequestDTO } from '../types/bigidTypes';

export interface ExportDataParams {
  entityType?: string;
  searchText?: string;
  fieldsToProject?: string[];
  paging?: {
    limit?: number;
    skip?: number;
  };
  format?: 'json' | 'csv';
}

export interface ExportInventoryParams {
  filter?: string;
  originFilterExpression?: string;
  type: 'source' | 'attribute';
}

export class ExportTools {
  constructor(private client: BigIDClient) {}

  /**
   * Export data for analysis
   */
  async exportData(params: ExportDataParams) {
    try {
      let response;
      
      if (params.entityType) {
        // Export data for specific entity type
        const request: DataExplorerRequestDTO = {
          searchText: params.searchText,
          paging: {
            limit: params.paging?.limit || 100,
            skip: params.paging?.skip || 0,
          },
          sort: [],
          isHighlight: false,
          fieldsToProject: params.fieldsToProject || [],
          needToHighlight: false,
        };

        response = await this.client.getDataExplorerObjectsForType(params.entityType, request);
      } else {
        // Export data for all entity types
        const request: DataExplorerRequestDTO = {
          searchText: params.searchText,
          paging: {
            limit: params.paging?.limit || 100,
            skip: params.paging?.skip || 0,
          },
          sort: [],
          isHighlight: false,
          fieldsToProject: params.fieldsToProject || [],
          needToHighlight: false,
        };

        response = await this.client.getDataExplorerObjects(request);
      }

      const data = this.transformDataForExport(response, params.format);

      return {
        success: true,
        data: data,
        summary: {
          totalResults: response.results.length,
          entityTypes: [...new Set(response.results.map(r => r.entityType))],
          format: params.format || 'json',
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
   * Export inventory data
   */
  async exportInventoryData(params: ExportInventoryParams) {
    try {
      let response;
      
      if (params.type === 'source') {
        response = await this.client.exportInventorySource({
          filter: params.filter,
          originFilterExpression: params.originFilterExpression,
        });
      } else {
        response = await this.client.exportInventoryAttribute({
          filter: params.filter,
          originFilterExpression: params.originFilterExpression,
        });
      }

      return {
        success: true,
        data: response,
        summary: {
          type: params.type,
          filter: params.filter,
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
   * Export data source attributes report
   */
  async exportDataSourceAttributesReport(dataSourceName: string) {
    try {
      const response = await this.client.exportDataSourceAttributesReport(dataSourceName);
      
      return {
        success: true,
        data: response,
        summary: {
          dataSourceName,
          format: 'csv',
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
   * Quick export with top hits
   */
  async quickExport(params: {
    searchText?: string;
    entityTypes?: string[];
    fieldsToProject?: string[];
    topHits?: number;
  }) {
    try {
      const request: DataExplorerQuickRequestDTO = {
        searchText: params.searchText,
        topHits: params.topHits || 10,
        entityTypes: params.entityTypes || [],
        fieldsToProject: params.fieldsToProject || [],
      };

      const response = await this.client.quickSearchDataExplorer(request);

      return {
        success: true,
        data: response,
        summary: {
          entityTypes: Object.keys(response.data),
          totalEntityTypes: Object.keys(response.data).length,
          results: Object.entries(response.data).map(([type, details]) => ({
            type,
            count: details.count,
            results: details.results.length,
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
   * Transform data for export format
   */
  private transformDataForExport(response: any, format?: string) {
    if (format === 'csv') {
      return this.transformToCSV(response);
    }
    
    // Default to JSON format
    return response;
  }

  /**
   * Transform data to CSV format
   */
  private transformToCSV(response: any): string {
    if (!response.results || response.results.length === 0) {
      return '';
    }

    // Get all unique field names
    const allFields = new Set<string>();
    response.results.forEach((result: any) => {
      if (result.data) {
        Object.keys(result.data).forEach(key => allFields.add(key));
      }
    });

    const fields = Array.from(allFields);
    
    // Create CSV header
    const header = ['entityType', 'id', ...fields].join(',');
    
    // Create CSV rows
    const rows = response.results.map((result: any) => {
      const values = [
        result.entityType || '',
        result.id || '',
        ...fields.map(field => {
          const value = result.data?.[field];
          // Escape CSV values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }),
      ];
      return values.join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Get object count for export planning
   */
  async getObjectCountForExport(params: { searchText?: string; entityType?: string }) {
    try {
      const request = {
        searchText: params.searchText,
      };

      let response;
      if (params.entityType) {
        response = await this.client.getObjectCountForType(params.entityType, request);
      } else {
        response = await this.client.getObjectCount(request);
      }

      return {
        success: true,
        data: response,
        summary: {
          totalCount: response.count,
          entityType: params.entityType || 'all',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
} 