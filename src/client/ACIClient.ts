import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { FilterConverter } from '../utils/FilterConverter';
import { 
  ACIDataManagerResponse, 
  ACIDataManagerParams,
  ACIGroupsResponse,
  ACIGroupsParams,
  ACIUsersResponse,
  ACIUsersParams,
  ACIPermission
} from '../types/aciTypes';

export class ACIClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;
  private domain: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.domain = domain;
    this.baseUrl = `https://${domain}/api/v1/aci`;
    
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
      (response) => {
        return response;
      },
      (error) => {
        // Log the error for debugging
        console.error('ACI Client Error:', error);
        return Promise.reject(ErrorHandler.handleApiError(error, 'ACIClient'));
      }
    );
  }

  /**
   * Get data manager items with optional filtering and pagination
   */
  async getDataManager(params: ACIDataManagerParams = {}): Promise<ACIDataManagerResponse> {
    const queryParams = new URLSearchParams();
    
    // Always include app_id=acl as shown in working request
    queryParams.append('app_id', 'acl');
    
    if (params.requireTotalCount !== undefined) {
      queryParams.append('requireTotalCount', params.requireTotalCount.toString());
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    
    // Always include empty sort and grouping parameters as shown in working request
    queryParams.append('sort', '');
    queryParams.append('grouping', '');
    
    // Handle filter parameter - support structured filter functionality
    if (params.filter !== undefined) {
      // Convert structured filter to BigID query string
      const filterQuery = FilterConverter.convertToBigIDQuery(params.filter);
      if (filterQuery && filterQuery.trim() !== '') {
        queryParams.append('filter', filterQuery);
      }
    }

    try {
      const response: AxiosResponse<ACIDataManagerResponse> = await this.client.get('/data-manager', {
        params: queryParams,
        headers: { Authorization: await this.auth.getAuthHeader() }
      });
      
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get ACI data manager');
    }
  }

  /**
   * Get permissions for a specific data manager item
   */
  async getDataManagerPermissions(itemPath: string, params: { skip?: number; limit?: number; requireTotalCount?: boolean } = {}): Promise<{ permissions: ACIPermission[] }> {
    const queryParams = new URLSearchParams();
    
    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.requireTotalCount !== undefined) {
      queryParams.append('requireTotalCount', params.requireTotalCount.toString());
    }

    try {
      // URL-encode the item path as shown in the working query
      const encodedPath = encodeURIComponent(itemPath);
      const response: AxiosResponse<{ permissions: ACIPermission[] }> = await this.client.get(`/data-manager/${encodedPath}/permissions?${queryParams.toString()}`, {
        headers: { Authorization: await this.auth.getAuthHeader() }
      });
      
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get ACI data manager permissions');
    }
  }

  /**
   * Get groups with optional filtering and pagination
   */
  async getGroups(params: ACIGroupsParams = {}): Promise<ACIGroupsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.requireTotalCount !== undefined) {
      queryParams.append('requireTotalCount', params.requireTotalCount.toString());
    }
    
    // Handle sort parameter - convert to JSON format if it's a simple string
    if (params.sort !== undefined && params.sort.trim() !== '') {
      // If it's already a JSON array, use it as is
      if (params.sort.startsWith('[') && params.sort.endsWith(']')) {
        queryParams.append('sort', params.sort);
      } else {
        // Convert simple field name to JSON format
        const sortJson = JSON.stringify([{ field: params.sort, order: 'asc' }]);
        queryParams.append('sort', sortJson);
      }
    }

    const response: AxiosResponse<ACIGroupsResponse> = await this.client.get(`/groups/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get users with optional filtering and pagination
   */
  async getUsers(params: ACIUsersParams = {}): Promise<ACIUsersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.requireTotalCount !== undefined) {
      queryParams.append('requireTotalCount', params.requireTotalCount.toString());
    }
    
    // Handle sort parameter - convert to JSON format if it's a simple string
    if (params.sort !== undefined && params.sort.trim() !== '') {
      // If it's already a JSON array, use it as is
      if (params.sort.startsWith('[') && params.sort.endsWith(']')) {
        queryParams.append('sort', params.sort);
      } else {
        // Convert simple field name to JSON format
        const sortJson = JSON.stringify([{ field: params.sort, order: 'asc' }]);
        queryParams.append('sort', sortJson);
      }
    }

    const response: AxiosResponse<ACIUsersResponse> = await this.client.get(`/users?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get the domain for cache key generation
   */
  getDomain(): string {
    return this.domain;
  }
} 