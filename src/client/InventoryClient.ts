import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PagingHelper } from '../utils/PagingHelper';
import {
  InventoryAggregationRequestDTO,
  InventoryResponseDTO,
  TagsAggregationRequestDTO,
  SensitivityFilterAggregationRequestDTO,
  SourceAggregationRequestDTO,
  SourceTypeAggregationRequestDTO,
  AttributeAggregationRequestDTO,
  CategoryExtendedAggregationRequestDTO,
  DataFormatAggregationRequestDTO,
  DuplicateFilesAggregationRequestDTO,
  ObjectStatusAggregationRequestDTO
} from '../types/inventoryTypes';

export class InventoryClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'InventoryClient'));
      }
    );
  }

  /**
   * Get inventory aggregations with custom parameters
   */
  async getAggregations(request: InventoryAggregationRequestDTO): Promise<InventoryResponseDTO> {
    try {
      const response: AxiosResponse<InventoryResponseDTO> = await this.client.post('/inventory', request);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get inventory aggregations');
    }
  }

  /**
   * Get inventory aggregation with specified aggregation type and parameters
   */
  async getInventoryAggregation(params: {
    aggregationType: 'tags' | 'sensitivityFilter' | 'source' | 'source.type' | 'attribute' | 'categoryExtended' | 'dataFormat' | 'duplicateFiles' | 'objectStatus';
    sorting?: Array<{
      field: string;
      order: 'ASC' | 'DESC';
    }>;
    paging?: {
      limit: number;
      skip: number;
    };
  }): Promise<InventoryResponseDTO> {
    try {
      const paging = PagingHelper.createPagingOptional(params, 0, 1000);
      const request: InventoryAggregationRequestDTO = {
        aggregations: [{
          aggName: params.aggregationType,
          sorting: params.sorting || [{ field: 'docCount', order: 'DESC' }],
          ...(paging && { paging })
        }]
      };
      return await this.getAggregations(request);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get inventory aggregation: ${params.aggregationType}`);
    }
  }
} 