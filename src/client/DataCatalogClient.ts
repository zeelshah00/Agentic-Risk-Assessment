import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import {
  CatalogRequestDTO,
  CatalogResponseDTO,
  ObjectDetailsDTO,
  TagDTO,
  CreateTagDTO,
  UpdateTagDTO,
  RuleDTO,
  CreateRuleDTO,
  UpdateRuleDTO,
  RelationDTO,
  CatalogExportRequestDTO,
  CatalogCountRequestDTO,
  CatalogCountResponseDTO,
  DistinctValuesRequestDTO,
  DistinctValuesResponseDTO,
  ObjectSummaryDTO,
  CatalogHealthDTO,
  CatalogApiResponse
} from '../types/catalogTypes';

export class DataCatalogClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.baseUrl = `https://${domain}/api/v1/data-catalog`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const authHeader = await this.auth.getAuthHeader();
      if (authHeader) {
        config.headers.Authorization = authHeader;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(ErrorHandler.handleApiError(error, 'DataCatalogClient'));
      }
    );
  }

  /**
   * Get data catalog objects with filtering and pagination
   */
  async getObjects(params: CatalogRequestDTO): Promise<CatalogResponseDTO> {
    try {
      const response: AxiosResponse<CatalogResponseDTO> = await this.client.get('/objects', {
        params
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get catalog objects');
    }
  }

  /**
   * Get data catalog objects using POST request with body parameters
   */
  async getObjectsPost(params: {
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
  }): Promise<CatalogResponseDTO> {
    try {
      const response: AxiosResponse<CatalogResponseDTO> = await this.client.post('', params);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get catalog objects via POST');
    }
  }

  /**
   * Get detailed information about a specific object
   */
  async getObjectDetails(fullyQualifiedName: string): Promise<ObjectDetailsDTO> {
    try {
      const response: AxiosResponse<ObjectDetailsDTO> = await this.client.get(`/object-details`, {
        params: { object_name: fullyQualifiedName }
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get object details for ${fullyQualifiedName}`);
    }
  }

  /**
   * Get object columns information
   */
  async getObjectColumns(fullyQualifiedName: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(`/object-details/columns`, {
        params: { object_name: fullyQualifiedName }
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get object columns for ${fullyQualifiedName}`);
    }
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<TagDTO[]> {
    try {
      const response: AxiosResponse<TagDTO[]> = await this.client.get('/tags');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get tags');
    }
  }

  /**
   * Create a new tag
   */
  async createTag(tag: CreateTagDTO): Promise<TagDTO> {
    try {
      const response: AxiosResponse<TagDTO> = await this.client.post('/tags', tag);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to create tag');
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, tag: UpdateTagDTO): Promise<TagDTO> {
    try {
      const response: AxiosResponse<TagDTO> = await this.client.patch(`/tags/${id}`, tag);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to update tag ${id}`);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      await this.client.delete(`/tags/${id}`);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to delete tag ${id}`);
    }
  }

  /**
   * Get all rules
   */
  async getRules(): Promise<RuleDTO[]> {
    try {
      const response: AxiosResponse<RuleDTO[]> = await this.client.get('/rules');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get rules');
    }
  }

  /**
   * Create a new rule
   */
  async createRule(rule: CreateRuleDTO): Promise<RuleDTO> {
    try {
      const response: AxiosResponse<RuleDTO> = await this.client.post('/rules', rule);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to create rule');
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(id: string, rule: UpdateRuleDTO): Promise<RuleDTO> {
    try {
      const response: AxiosResponse<RuleDTO> = await this.client.patch(`/rules/${id}`, rule);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to update rule ${id}`);
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    try {
      await this.client.delete(`/rules/${id}`);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to delete rule ${id}`);
    }
  }

  /**
   * Apply a rule
   */
  async applyRule(ruleId: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post(`/rules/apply/${ruleId}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to apply rule ${ruleId}`);
    }
  }

  /**
   * Apply all rules
   */
  async applyAllRules(): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post('/rules/apply-all');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to apply all rules');
    }
  }

  /**
   * Get rule count
   */
  async getRuleCount(ruleId: string): Promise<number> {
    try {
      const response: AxiosResponse<{ count: number }> = await this.client.get(`/rules/${ruleId}/count`);
      return response.data.count;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get rule count for ${ruleId}`);
    }
  }

  /**
   * Get data relationships for an object
   */
  async getRelations(fullyQualifiedName: string): Promise<RelationDTO[]> {
    try {
      const response: AxiosResponse<RelationDTO[]> = await this.client.get(`/relations/${encodeURIComponent(fullyQualifiedName)}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get relations for ${fullyQualifiedName}`);
    }
  }

  /**
   * Get all relations
   */
  async getAllRelations(): Promise<RelationDTO[]> {
    try {
      const response: AxiosResponse<RelationDTO[]> = await this.client.get('/relations');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get all relations');
    }
  }

  /**
   * Export catalog data
   */
  async exportCatalog(format: string, filter?: string): Promise<Buffer> {
    try {
      const response: AxiosResponse<Buffer> = await this.client.get('/file-download/export', {
        params: { format, filter },
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to export catalog data');
    }
  }

  /**
   * Get catalog count
   */
  async getCount(params: CatalogCountRequestDTO): Promise<CatalogCountResponseDTO> {
    try {
      const response: AxiosResponse<CatalogCountResponseDTO> = await this.client.get('/count', {
        params
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get catalog count');
    }
  }

  /**
   * Get distinct values for a field
   */
  async getDistinctValues(fieldName: string, params: DistinctValuesRequestDTO): Promise<DistinctValuesResponseDTO> {
    try {
      const response: AxiosResponse<DistinctValuesResponseDTO> = await this.client.get(`/distinct-values/${fieldName}`, {
        params
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get distinct values for field ${fieldName}`);
    }
  }

  /**
   * Get object summary
   */
  async getObjectSummary(): Promise<ObjectSummaryDTO> {
    try {
      const response: AxiosResponse<ObjectSummaryDTO> = await this.client.get('/object-summary');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get object summary');
    }
  }

  /**
   * Get catalog health status
   */
  async getHealth(): Promise<CatalogHealthDTO> {
    try {
      const response: AxiosResponse<CatalogHealthDTO> = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get catalog health status');
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(params?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get('/version-history', { params });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get version history');
    }
  }

  /**
   * Get manual fields
   */
  async getManualFields(): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get('/manual-fields');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get manual fields');
    }
  }

  /**
   * Get manual fields by source
   */
  async getManualFieldsBySource(source: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(`/manual-fields/by-source`, {
        params: { source }
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get manual fields for source ${source}`);
    }
  }

  /**
   * Get row level findings count
   */
  async getRowLevelFindingsCount(params?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post('/row-level-findings/count', params);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get row level findings count');
    }
  }

  /**
   * Get row level findings stream
   */
  async getRowLevelFindingsStream(params?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post('/row-level-findings/stream', params, {
        responseType: 'stream'
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get row level findings stream');
    }
  }

  /**
   * Get data source risk summary
   */
  async getDataSourceRiskSummary(dsName?: string): Promise<any> {
    try {
      const url = dsName ? `/ds-risk/summary/${dsName}` : '/ds-risk/summary';
      const response: AxiosResponse = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get data source risk summary');
    }
  }

  /**
   * Get integration settings
   */
  async getIntegrationSettings(id?: string): Promise<any> {
    try {
      const url = id ? `/integration-settings/${id}` : '/integration-settings';
      const response: AxiosResponse = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get integration settings');
    }
  }






} 