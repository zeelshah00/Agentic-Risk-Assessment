import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';

export class DSPMClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.baseUrl = `https://${domain}/api/v1/actionable-insights`;
    
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'DSPMClient'));
      }
    );
  }

  /**
   * Get security cases with filtering and pagination
   */
  async getSecurityCases(params: {
    caseStatus?: 'open' | 'closed' | 'ignored';
    severity?: string;
    skip?: number;
    limit?: number;
    filter?: string;
    requireTotalCount?: boolean;
  } = {}): Promise<any> {
    try {
      // Build the request parameters
      const requestParams: any = {};
      
      // Add optional parameters only if they exist
      if (params.skip !== undefined) requestParams.skip = params.skip;
      if (params.limit !== undefined) requestParams.limit = params.limit;
      if (params.requireTotalCount !== undefined) requestParams.requireTotalCount = params.requireTotalCount;
      
      // Handle filter parameter - ensure it's properly formatted
      if (params.filter) {
        try {
          // Try to parse it to see if it's valid JSON
          JSON.parse(params.filter);
          requestParams.filter = params.filter;
        } catch (e) {
          // If it's not valid JSON, it might be a simple string filter
          requestParams.filter = params.filter;
        }
      }
      
      const response: AxiosResponse<any> = await this.client.get('/cases-group-by-policy', {
        params: requestParams
      });
      
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get security cases');
    }
  }

  /**
   * Get cases grouped by policy with unified parameter handling
   * All parameters are available to every call of the endpoint
   */
  async getCasesGroupByPolicy(params: {
    groupBy?: 'policy' | 'severity' | 'status' | 'dataSource';
    filter?: string;
    limit?: number;
    skip?: number;
    requireTotalCount?: boolean;
  } = {}): Promise<any> {
    try {
      // Build the request parameters, ensuring proper encoding
      const requestParams: any = {
        groupBy: params.groupBy || 'policy'
      };
      
      // Add optional parameters only if they exist
      if (params.skip !== undefined) requestParams.skip = params.skip;
      if (params.limit !== undefined) requestParams.limit = params.limit;
      if (params.requireTotalCount !== undefined) requestParams.requireTotalCount = params.requireTotalCount;
      
      // Handle filter parameter - ensure it's properly formatted
      if (params.filter) {
        // If filter is already a JSON string, use it as is
        // If it's a string that looks like JSON, validate it
        try {
          // Try to parse it to see if it's valid JSON
          JSON.parse(params.filter);
          requestParams.filter = params.filter;
        } catch (e) {
          // If it's not valid JSON, it might be a simple string filter
          requestParams.filter = params.filter;
        }
      }
      
      const response: AxiosResponse<any> = await this.client.get('/cases-group-by-policy', {
        params: requestParams
      });
      
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get cases grouped by policy');
    }
  }

  /**
   * Get security trends for the last 30 days
   */
  async getTrends(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await this.client.get('/trends');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get security trends');
    }
  }
} 