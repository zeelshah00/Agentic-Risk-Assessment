import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';

export interface LineageTreeRequest {
  anchorCollections: string[];
  anchorAttributeType?: string;
}

export interface LineageTreeResponse {
  lineageTree: Array<{
    _id: string;
    source: string;
    scanId: string;
    totalRows: number;
    totalRowsWithFindings: number;
    total_pii_count: number;
    fields: Array<{
      fieldName: string;
      fieldType: string;
      fieldCount: number;
      findingCount: number;
      fieldClassifications: Array<{
        name: string;
        rank: string;
        confidence_level: number;
      }>;
      fieldAttribute: Array<{
        name: string;
        rank: string;
        confidence_level?: number;
      }>;
    }>;
    childs: any[];
    connection_details: Array<{
      linked_collection: string;
      origin_fields: string;
      destination_field: string;
      type: string;
      is_mirror: boolean;
    }>;
    links_depth: number;
  }>;
}

export class LineageClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.baseUrl = `https://${domain}/api/v1`;
    
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'LineageClient'));
      }
    );
  }

  /**
   * Get lineage tree with multiple anchor collections
   */
  async getLineageTree(params: LineageTreeRequest): Promise<LineageTreeResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add anchor collections
      params.anchorCollections.forEach(collection => {
        queryParams.append('anchorCollections', collection);
      });
      
      // Add anchor attribute type if specified
      if (params.anchorAttributeType) {
        queryParams.append('anchorAttributeType', params.anchorAttributeType);
      }

      const response: AxiosResponse<LineageTreeResponse> = await this.client.get(
        `/lineage/tree/?${queryParams.toString()}`
      );
      
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get lineage tree');
    }
  }
} 