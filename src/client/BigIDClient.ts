import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { BigIDConfig } from '../config/types';
import {
  QuickSearchRequest,
  SearchDocumentResponse,
  FullSearchRequest,
  SearchFullDocumentResponse,
  SyncControl,
  InventoryRequestAggDTO,
  InventoryResponseDTO,
  DataExplorerRequestDTO,
  DataExplorerObjectsResponse,
  DataExplorerQuickRequestDTO,
  DataExplorerQuickSearchResponse,
  DataExplorerObjectsBaseRequestDTO,
  DataExplorerCountObjectsResponseDTO,
  IndexStatusResponse,
  UpdateAndRefreshRequestBodyDTO,
  UpdateByFqnResponseDTO,
  PartialIndexRequestBodyDTO,
  FilteredSearchRequest,
  TypeFilterResponse,
  SuggestionResponse,
  IndexTaskBodyDTO,
} from '../types/bigidTypes';

export class BigIDClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private config: BigIDConfig;

  constructor(auth: BigIDAuth, config: BigIDConfig) {
    this.auth = auth;
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.domain}/api/v1`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(async (config) => {
      const authHeader = await this.auth.getAuthHeader();
      config.headers.Authorization = authHeader;
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Check if this is already a retry to prevent infinite loops
          if (error.config._retryCount && error.config._retryCount >= 1) {
            return Promise.reject(error);
          }
          
          // Token expired, clear and retry once
          this.auth.clearToken();
          const authHeader = await this.auth.getAuthHeader();
          error.config.headers.Authorization = authHeader;
          error.config._retryCount = (error.config._retryCount || 0) + 1;
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Quick search across all entity types
   */
  async quickSearch(params: QuickSearchRequest): Promise<SearchDocumentResponse> {
    const response: AxiosResponse<SearchDocumentResponse> = await this.client.post(
      '/metadata-search/search/quick',
      params
    );
    return response.data;
  }

  /**
   * Full search with advanced filtering and pagination
   */
  async fullSearch(params: FullSearchRequest): Promise<SearchFullDocumentResponse> {
    const response: AxiosResponse<SearchFullDocumentResponse> = await this.client.post(
      '/metadata-search/search/full',
      params
    );
    return response.data;
  }



  /**
   * Get entity type by name
   */
  async getEntityType(entityType: string): Promise<SyncControl> {
    const response: AxiosResponse<SyncControl> = await this.client.get(`/metadata-search/entity-types/${entityType}`);
    return response.data;
  }

  /**
   * Get inventory aggregations
   */
  async getInventoryAggregations(params: InventoryRequestAggDTO): Promise<InventoryResponseDTO> {
    const response: AxiosResponse<InventoryResponseDTO> = await this.client.post('/inventory', params);
    return response.data;
  }

  /**
   * Get inventory aggregations for specific entity type
   */
  async getInventoryAggregationsForType(entityType: string, params: InventoryRequestAggDTO): Promise<InventoryResponseDTO> {
    const response: AxiosResponse<InventoryResponseDTO> = await this.client.post(`/inventory/${entityType}`, params);
    return response.data;
  }

  /**
   * Get objects from data explorer
   */
  async getDataExplorerObjects(params: DataExplorerRequestDTO): Promise<DataExplorerObjectsResponse> {
    const response: AxiosResponse<DataExplorerObjectsResponse> = await this.client.post('/data-explorer/objects', params);
    return response.data;
  }

  /**
   * Get objects from data explorer for specific entity type
   */
  async getDataExplorerObjectsForType(entityType: string, params: DataExplorerRequestDTO): Promise<DataExplorerObjectsResponse> {
    const response: AxiosResponse<DataExplorerObjectsResponse> = await this.client.post(`/data-explorer/objects/${entityType}`, params);
    return response.data;
  }

  /**
   * Quick search in data explorer
   */
  async quickSearchDataExplorer(params: DataExplorerQuickRequestDTO): Promise<DataExplorerQuickSearchResponse> {
    const response: AxiosResponse<DataExplorerQuickSearchResponse> = await this.client.post('/data-explorer/objects/quick', params);
    return response.data;
  }

  /**
   * Get count of objects
   */
  async getObjectCount(params: DataExplorerObjectsBaseRequestDTO): Promise<DataExplorerCountObjectsResponseDTO> {
    const response: AxiosResponse<DataExplorerCountObjectsResponseDTO> = await this.client.post('/data-explorer/count', params);
    return response.data;
  }

  /**
   * Get count of objects for specific entity type
   */
  async getObjectCountForType(entityType: string, params: DataExplorerObjectsBaseRequestDTO): Promise<DataExplorerCountObjectsResponseDTO> {
    const response: AxiosResponse<DataExplorerCountObjectsResponseDTO> = await this.client.post(`/data-explorer/count/${entityType}`, params);
    return response.data;
  }

  /**
   * Get index status
   */
  async getIndexStatus(): Promise<IndexStatusResponse> {
    const response: AxiosResponse<IndexStatusResponse> = await this.client.get('/metadata-search/status');
    return response.data;
  }

  /**
   * Get health check
   */
  async getHealthCheck(): Promise<any> {
    try {
      // Use the original health check endpoint that was working
      const response: AxiosResponse<any> = await this.client.get('/metadata-search/health-check', {
        timeout: 15000 // 15 second timeout
      });
      return {
        status: 'OK',
        message: 'BigID API is accessible',
        timestamp: new Date().toISOString(),
        data: response.data
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'ERROR',
        message: 'BigID API is not accessible',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update and refresh a document
   */
  async updateAndRefreshDocument(params: UpdateAndRefreshRequestBodyDTO): Promise<UpdateByFqnResponseDTO> {
    const response: AxiosResponse<UpdateByFqnResponseDTO> = await this.client.post('/metadata-search/sync/update-object', params);
    return response.data;
  }

  /**
   * Partial indexing
   */
  async partialIndex(entityType: string, params: PartialIndexRequestBodyDTO): Promise<void> {
    await this.client.post(`/metadata-search/index-by-filter/${entityType}`, params);
  }

  /**
   * Get filter fields
   */
  async getFilterFields(params: FilteredSearchRequest): Promise<TypeFilterResponse> {
    const response: AxiosResponse<TypeFilterResponse> = await this.client.post('/metadata-search/filter', params);
    return response.data;
  }

  /**
   * Get filter suggestions
   */
  async getFilterSuggestions(params: FilteredSearchRequest): Promise<SuggestionResponse> {
    const response: AxiosResponse<SuggestionResponse> = await this.client.post('/metadata-search/filter/suggest', params);
    return response.data;
  }

  /**
   * Start indexing task
   */
  async startIndexingTask(entityType: string, params: IndexTaskBodyDTO): Promise<any> {
    const response: AxiosResponse<any> = await this.client.put(`/metadata-search/index-task/${entityType}`, params);
    return response.data;
  }

  /**
   * Cancel indexing task
   */
  async cancelIndexingTask(entityType: string): Promise<any> {
    const response: AxiosResponse<any> = await this.client.delete(`/metadata-search/index-task/${entityType}`);
    return response.data;
  }

  /**
   * Export inventory source data
   */
  async exportInventorySource(params: any): Promise<any> {
    const response: AxiosResponse<any> = await this.client.post('/inventory/file-download/export/source', params);
    return response.data;
  }

  /**
   * Export inventory attribute data
   */
  async exportInventoryAttribute(params: any): Promise<any> {
    const response: AxiosResponse<any> = await this.client.post('/inventory/file-download/export/attribute', params);
    return response.data;
  }

  /**
   * Get monitoring token
   */
  async getMonitoringToken(ignoreHeader?: boolean): Promise<string> {
    const params = ignoreHeader ? { ignoreHeader } : {};
    const response: AxiosResponse<string> = await this.client.get('/metadata-search/admin/monitoring/getToken', { params });
    return response.data;
  }

  /**
   * Create scheduling task for tenant
   */
  async createSchedulingTaskForTenant(tenantId: string): Promise<string> {
    const response: AxiosResponse<string> = await this.client.put(`/metadata-search/admin/monitoring/scheduleIndexing/${tenantId}`);
    return response.data;
  }

  /**
   * Run warmup
   */
  async runWarmup(): Promise<void> {
    await this.client.post('/manual/warmup');
  }

  /**
   * Export data source attributes report
   */
  async exportDataSourceAttributesReport(dataSourceName: string): Promise<string> {
    const response: AxiosResponse<string> = await this.client.get(`/metadata-search/report/${dataSourceName}`, {
      headers: {
        'Accept': 'text/csv',
      },
    });
    return response.data;
  }
} 