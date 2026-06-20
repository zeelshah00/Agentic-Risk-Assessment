import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import {
  BasicScConfigDto,
  ScConfigCreateResultDto,
  ScConfigsGetResponseDto,
  ClassificationTotalRatioResponse,
  ClassificationRatioResponse,
  SensitivityClassificationApiResponse
} from '../types/sensitivityClassificationTypes';

export class SensitivityClassificationClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'SensitivityClassificationClient'));
      }
    );
  }

  /**
   * Get active sensitivity groups
   */
  async getScConfigs(params: {
    skip?: number;
    limit?: number;
    sort?: string;
    filter?: string;
    requireTotalCount?: boolean;
  }): Promise<ScConfigsGetResponseDto> {
    try {
      const response: AxiosResponse<ScConfigsGetResponseDto> = await this.client.get('/aci/sc/configs', {
        params
      });
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get sensitivity configurations');
    }
  }

  /**
   * Create a new sensitivity group
   */
  async createScConfig(config: BasicScConfigDto): Promise<ScConfigCreateResultDto> {
    try {
      const response: AxiosResponse<ScConfigCreateResultDto> = await this.client.post('/aci/sc/configs', config);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to create sensitivity configuration');
    }
  }

  /**
   * Update an existing sensitivity group
   */
  async updateScConfig(config: BasicScConfigDto): Promise<ScConfigCreateResultDto> {
    try {
      const response: AxiosResponse<ScConfigCreateResultDto> = await this.client.put('/aci/sc/configs', config);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to update sensitivity configuration');
    }
  }

  /**
   * Get sensitivity group by ID
   */
  async getScConfigById(id: string): Promise<ScConfigCreateResultDto> {
    try {
      const response: AxiosResponse<ScConfigCreateResultDto> = await this.client.get(`/aci/sc/configs/${id}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get sensitivity configuration for ID ${id}`);
    }
  }

  /**
   * Delete sensitivity group by ID
   */
  async deleteScConfig(id: string): Promise<void> {
    try {
      await this.client.delete(`/aci/sc/configs/${id}`);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to delete sensitivity configuration for ID ${id}`);
    }
  }

  /**
   * Get the ratio of classified to unclassified objects
   */
  async getTotalClassificationRatios(): Promise<ClassificationTotalRatioResponse> {
    try {
      const response: AxiosResponse<ClassificationTotalRatioResponse> = await this.client.get('/aci/sc/ratio');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get total classification ratios');
    }
  }

  /**
   * Get classification ratio by group name
   */
  async getClassificationRatioByName(name: string): Promise<ClassificationRatioResponse> {
    try {
      const response: AxiosResponse<ClassificationRatioResponse> = await this.client.get(`/aci/sc/ratio/name/${name}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get classification ratio for group name ${name}`);
    }
  }

  /**
   * Get classification ratio by group ID
   */
  async getClassificationRatioById(id: string): Promise<ClassificationRatioResponse> {
    try {
      const response: AxiosResponse<ClassificationRatioResponse> = await this.client.get(`/aci/sc/ratio/id/${id}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get classification ratio for group ID ${id}`);
    }
  }
} 