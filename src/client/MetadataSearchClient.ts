import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PagingHelper } from '../utils/PagingHelper';

export class MetadataSearchClient {
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

    this.client.interceptors.request.use(async (config) => {
      const authHeader = await this.auth.getAuthHeader();
      if (authHeader) {
        config.headers.Authorization = authHeader;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(ErrorHandler.handleApiError(error, 'MetadataSearchClient'));
      }
    );
  }

  async quickSearch(params: any): Promise<any> {
    try {
      // Ensure required fields have defaults
      const requestBody = {
        text: params.text,
        filter: params.filter || [],
        top: params.top || 10
      };
      
      const response: AxiosResponse<any> = await this.client.post('/metadata-search/search/quick', requestBody);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to perform quick search');
    }
  }

  async fullSearch(params: any): Promise<any> {
    try {
      // Handle paging properly using the PagingHelper - only include if specified
      const paging = PagingHelper.createPagingOptional(params, 0, 20);

      const requestBody: any = {
        text: params.text,
        filter: params.filter || [],
        sort: params.sort || []
      };
      
      // Only add paging if it was specified
      if (paging) {
        requestBody.paging = paging;
      }
      
      const response: AxiosResponse<any> = await this.client.post('/metadata-search/search/full', requestBody);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to perform full search');
    }
  }

  async objectsSearch(entityType: string | null, params: any): Promise<any> {
    try {
      // Handle paging properly using the PagingHelper - only include if specified
      const paging = PagingHelper.createPagingOptional(params, 0, 10);

      const requestBody: any = {
        searchText: params.searchText,
        sort: params.sort || [],
        isHighlight: params.isHighlight || false,
        fieldsToProject: params.fieldsToProject || [],
        offset: params.offset || null,
        needToHighlight: params.needToHighlight || false
      };
      
      // Only add paging if it was specified
      if (paging) {
        requestBody.paging = paging;
      }
      
      const url = entityType ? `/data-explorer/objects/${entityType}` : '/data-explorer/objects';
      const response: AxiosResponse<any> = await this.client.post(url, requestBody);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to search for objects');
    }
  }

  async objectsCount(entityType: string | null, params: any): Promise<any> {
    try {
      // Ensure required fields for count API
      const requestBody = {
        searchText: params.searchText
      };
      
      const url = entityType ? `/data-explorer/count/${entityType}` : '/data-explorer/count';
      const response: AxiosResponse<any> = await this.client.post(url, requestBody);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to count objects');
    }
  }
} 