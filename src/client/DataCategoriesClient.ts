import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import {
  DataCategoryDTO,
  CreateDataCategoryDTO,
  CreateDataCategoryResponseDTO,
  DataCategoriesApiResponse
} from '../types/dataCategoriesTypes';

export class DataCategoriesClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'DataCategoriesClient'));
      }
    );
  }

  /**
   * Get all data categories
   */
  async getDataCategories(): Promise<DataCategoryDTO[]> {
    try {
      const response: AxiosResponse<DataCategoryDTO[]> = await this.client.get('/data_categories/');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get data categories');
    }
  }

  /**
   * Create a new data category
   */
  async createDataCategory(category: CreateDataCategoryDTO): Promise<CreateDataCategoryResponseDTO> {
    try {
      const response: AxiosResponse<CreateDataCategoryResponseDTO> = await this.client.post('/data_categories/', category);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to create data category');
    }
  }
} 